"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types";
import toast from "react-hot-toast";
import { mapOrder, mapQuerySnapshot } from "@/lib/mappers";
import Link from "next/link";

export default function RiderApp() {
 const { user } = useAuth();
 const [orders, setOrders] = useState<Order[]>([]);
 const [selectedFilterSlot, setSelectedFilterSlot] = useState<string>("ALL");
 const [availableSlots, setAvailableSlots] = useState<string[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
 const unsub = onSnapshot(q, (snap) => {
 try {
 const allOrds = mapQuerySnapshot(snap, mapOrder);
 const ords = allOrds.filter(data => data.status === "PLACED"|| (data.riderId === user?.uid && data.status !== "DELIVERED")
 );
 // Extract unique slots for filtering
 const slots = Array.from(new Set(ords.map(o => o.deliverySlot).filter(Boolean))) as string[];
 setAvailableSlots(slots);

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
 });
 return () => unsub();
 }, [user]);

 const filteredOrders = selectedFilterSlot === "ALL"? orders : orders.filter(o => o.deliverySlot === selectedFilterSlot);

 if (loading) return (
 <div className="space-y-4 pt-10">
 {[1,2,3,4].map(i => (
 <div key={i} className="h-20 bg-white rounded-2xl animate-pulse"/>
 ))}
 </div>
 );

 return (
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
 <div className="flex items-end justify-between px-2">
 <div>
 <h2 className="text-3xl font-headline font-black text-zinc-900 tracking-tight">Pulse Feed</h2>
 <p className="text-[10px] font-black text-zinc-400 mt-1">{filteredOrders.length} active jobs</p>
 </div>
 <div className="flex items-center gap-2 bg-green-50 text-green-600 px-3 py-1.5 rounded-xl border border-green-100">
 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
 <span className="text-[10px] font-black leading-none">Scanning</span>
 </div>
 </div>

 {/* Slot Filter Bar */}
 {availableSlots.length > 0 && (
 <div className="flex gap-2 overflow-x-auto hide-scrollbar py-2">
 <button onClick={() => setSelectedFilterSlot("ALL")}
 className={`px-6 py-2.5 rounded-full text-[9px] font-black transition-all whitespace-nowrap ${selectedFilterSlot === "ALL"? 'bg-zinc-900 text-white shadow-xl': 'bg-white text-zinc-400 border border-zinc-100'}`}
 >
 All slots
 </button>
 {availableSlots.map(slot => (
 <button key={slot}
 onClick={() => setSelectedFilterSlot(slot)}
 className={`px-6 py-2.5 rounded-full text-[9px] font-black transition-all whitespace-nowrap ${selectedFilterSlot === slot ? 'bg-primary text-zinc-900 shadow-xl shadow-primary/20': 'bg-white text-zinc-400 border border-zinc-100'}`}
 >
 {slot}
 </button>
 ))}
 </div>
 )}

 <div className="space-y-3">
 {filteredOrders.length === 0 ? (
 <div className="py-20 bg-white rounded-[40px] border border-dashed border-zinc-200 flex flex-col items-center">
 <span className="material-symbols-outlined text-6xl text-zinc-100 mb-4"style={{fontVariationSettings: "'FILL'1"}}>speed</span>
 <p className="text-zinc-400 font-black text-[10px]">No orders in this slot</p>
 </div>
 ) : (
 filteredOrders.map((order) => (
 <Link href={`/rider/orders/${order.id}`} key={order.id} className={`block bg-white rounded-3xl p-6 shadow-sm border border-zinc-100 relative group transition-all hover:shadow-xl hover:border-primary active:scale-[0.98] ${order.riderId === user?.uid ? 'ring-2 ring-primary ring-offset-2': ''}`}
 >
 <div className="flex justify-between items-center text-[#1A1A1A]">
 <div className="flex flex-col gap-1 text-[#1A1A1A]">
 <div className="flex items-center gap-2 mb-1">
 <span className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-lg ${order.status === 'PLACED'? 'bg-primary': 'bg-blue-500'}`}></span>
 <span className="text-xl font-headline font-black text-zinc-900 tracking-tighter">#{order.id?.slice(-8).toUpperCase()}</span>
 </div>
 <div className="mb-2">
 <p className="text-[11px] font-black text-zinc-900 leading-none">{order.customerName || 'Customer'}</p>
 {order.deliverySlot && (
 <p className="text-[9px] font-black text-primary tracking-[0.2em] mt-1.5 flex items-center gap-1.5">
 <span className="material-symbols-outlined text-xs">calendar_today</span>
 {order.deliverySlot}
 </p>
 )}
 </div>

 <div className="flex items-center gap-2 opacity-60">
 <span className="material-symbols-outlined text-sm text-zinc-400">schedule</span>
 <p className="text-[10px] font-black text-zinc-500 tracking-widest">
 {new Date(order.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric'})} • {new Date(order.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit'})}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-300 group-hover:bg-primary group-hover:text-zinc-900 transition-all">
 <span className="material-symbols-outlined font-black">arrow_forward</span>
 </div>
 </div>
 </div>

 {order.riderId === user?.uid && (
 <div className="absolute top-0 right-16 bg-primary text-zinc-900 px-4 py-1 rounded-b-xl font-black text-[8px] tracking-widest shadow-md">Assigned Job</div>
 )}
 </Link>
 ))
 )}
 </div>
 </div>
 );
}
