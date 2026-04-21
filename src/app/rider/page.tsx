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
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
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

        const slots = Array.from(new Set(ords.map(o => o.deliverySlot).filter(Boolean))) as string[];
        setAvailableSlots(slots);
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

  const filteredOrders = orders.filter(o => {
    const matchesSlot = selectedFilterSlot === "ALL" || o.deliverySlot === selectedFilterSlot;
    const orderDate = o.deliveryDate || (o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-CA') : '');
    const matchesDate = selectedFilterDate === "ALL" || orderDate === selectedFilterDate;
    return matchesSlot && matchesDate;
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
            <Link href={`/rider/orders/${order.id}`} key={order.id} className={`block bg-white rounded-[32px] p-7 shadow-sm border border-zinc-100 relative group transition-all hover:shadow-2xl hover:border-primary active:scale-[0.98] ${order.riderId === user?.uid ? 'ring-2 ring-primary ring-offset-2': ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full animate-pulse ${order.status === 'PLACED'? 'bg-primary shadow-[0_0_10px_rgba(34,197,94,0.4)]': 'bg-blue-500'}`}></span>
                      <span className="text-2xl font-headline font-black text-zinc-900 tracking-tighter">#{order.id?.slice(-8).toUpperCase()}</span>
                    </div>
                    {order.riderId === user?.uid && (
                      <span className="bg-primary/20 text-primary-dark text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">My Task</span>
                    )}
                  </div>

                  <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
                    <p className="text-[14px] font-black text-zinc-900 leading-tight mb-1">{order.customerName || 'Customer'}</p>
                    <p className="text-[10px] font-bold text-zinc-600 truncate mb-3">{order.deliveryAddress?.line1}, {order.deliveryAddress?.city}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {order.deliverySlot && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-zinc-200">
                          <span className="material-symbols-outlined text-xs text-primary font-black">schedule</span>
                          <span className="text-[11px] font-black text-zinc-900">{order.deliverySlot}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-zinc-200">
                        <span className="material-symbols-outlined text-xs text-zinc-400 font-black">calendar_today</span>
                        <span className="text-[11px] font-black text-zinc-900">
                          {order.deliveryDate === new Date().toLocaleDateString('en-CA') ? 'TODAY' : order.deliveryDate || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-zinc-400">info</span>
                      <p className="text-[9px] font-black text-zinc-500 tracking-widest uppercase">
                        {order.items.length} items • ₹{order.total.toFixed(0)}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-zinc-300 group-hover:translate-x-1 group-hover:text-primary transition-all">arrow_forward_ios</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
