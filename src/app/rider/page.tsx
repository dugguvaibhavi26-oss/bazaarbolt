"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, where, or } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types";
import toast from "react-hot-toast";
import { mapOrder, mapQuerySnapshot } from "@/lib/mappers";
import Link from "next/link";

export default function RiderApp() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedFilterSlot, setSelectedFilterSlot] = useState<string>("ALL");
  const [selectedFilterDate, setSelectedFilterDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "orders"), 
      or(
        where("status", "==", "PLACED"),
        where("riderId", "==", user.uid)
      )
    );
    
    const unsub = onSnapshot(q, (snap) => {
      try {
        const allOrds = mapQuerySnapshot(snap, mapOrder);
        const ords = allOrds.filter(data => 
          data.status === "PLACED" || (data.riderId === user?.uid && data.status !== "DELIVERED")
        );
        
        ords.sort((a, b) => {
          if (a.riderId === user?.uid && b.riderId !== user?.uid) return -1;
          if (a.riderId !== user?.uid && b.riderId === user?.uid) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setOrders(ords);
      } catch (e) {
        console.error("Mapping error in RiderApp:", e);
      }
      setLoading(false);
    }, (err) => {
      console.error("Pulse Feed error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const dateFilteredOrders = orders.filter(o => {
    const orderDate = o.deliveryDate || (o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-CA') : '');
    return selectedFilterDate === "ALL" || orderDate === selectedFilterDate;
  });

  const availableSlots = Array.from(new Set(dateFilteredOrders.map(o => o.deliverySlot).filter(Boolean))) as string[];

  const filteredOrders = dateFilteredOrders.filter(o => {
    return selectedFilterSlot === "ALL" || o.deliverySlot === selectedFilterSlot;
  });

  if (loading) return (
    <div className="space-y-4 pt-10">
      {[1,2,3,4].map(i => (
        <div key={i} className="h-20 bg-white rounded-2xl animate-pulse"/>
      ))}
    </div>
  );

  const filterDates = [
    { label: "Today", value: new Date().toLocaleDateString('en-CA') },
    { label: "Tomorrow", value: new Date(Date.now() + 86400000).toLocaleDateString('en-CA') },
    { label: "All Time", value: "ALL" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-end justify-between px-2">
        <div>
          <h2 className="text-3xl font-headline font-black text-zinc-900 tracking-tight">Pulse Feed</h2>
          <p className="text-[10px] font-black text-zinc-600 mt-1 uppercase tracking-widest">{filteredOrders.length} active jobs</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-xl border border-green-100">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
          <span className="text-[10px] font-black leading-none uppercase tracking-wider">Live</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Date Filter */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
          {filterDates.map(d => (
            <button key={d.value}
              onClick={() => setSelectedFilterDate(d.value)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest ${selectedFilterDate === d.value ? 'bg-zinc-900 text-white shadow-xl': 'bg-white text-zinc-500 border border-zinc-100'}`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Slot Filter Bar */}
        {availableSlots.length > 0 && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
            <button onClick={() => setSelectedFilterSlot("ALL")}
              className={`px-5 py-2.5 rounded-xl text-[9px] font-black transition-all whitespace-nowrap uppercase tracking-widest ${selectedFilterSlot === "ALL"? 'bg-zinc-900 text-white shadow-lg': 'bg-white text-zinc-400 border border-zinc-100'}`}
            >
              All slots
            </button>
            {availableSlots.map(slot => (
              <button key={slot}
                onClick={() => setSelectedFilterSlot(slot)}
                className={`px-5 py-2.5 rounded-xl text-[9px] font-black transition-all whitespace-nowrap uppercase tracking-widest ${selectedFilterSlot === slot ? 'bg-primary text-zinc-900 shadow-lg shadow-primary/20': 'bg-white text-zinc-400 border border-zinc-100'}`}
              >
                {slot}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="py-24 bg-white rounded-[40px] border border-dashed border-zinc-200 flex flex-col items-center">
            <span className="material-symbols-outlined text-6xl text-zinc-100 mb-4" style={{fontVariationSettings: "'FILL'1"}}>speed</span>
            <p className="text-zinc-400 font-black text-[10px] uppercase tracking-widest">Clear for now</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <Link href={`/rider/orders/${order.id}`} key={order.id} className={`block bg-white rounded-2xl p-4 shadow-sm border border-zinc-100 group transition-all hover:shadow-md hover:border-primary active:scale-[0.98] ${order.riderId === user?.uid ? 'ring-2 ring-primary border-primary': ''}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${order.status === 'PLACED'? 'bg-primary shadow-[0_0_8px_rgba(34,197,94,0.4)]': 'bg-blue-500'}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-zinc-900 truncate leading-none">{order.customerName || 'Customer'}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">#{order.id?.slice(-6).toUpperCase()}</p>
                      {order.riderId === user?.uid && (
                        <span className="text-[7px] font-black text-primary uppercase tracking-widest bg-primary/10 px-1.5 py-0.5 rounded">My Task</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {order.deliverySlot && (
                    <div className="flex items-center gap-1.5 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-100">
                      <span className="material-symbols-outlined text-[14px] text-primary font-black">schedule</span>
                      <span className="text-[10px] font-black text-zinc-700 whitespace-nowrap">{order.deliverySlot}</span>
                    </div>
                  )}
                  <span className="material-symbols-outlined text-zinc-300 group-hover:translate-x-1 group-hover:text-primary transition-all text-sm">arrow_forward_ios</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
