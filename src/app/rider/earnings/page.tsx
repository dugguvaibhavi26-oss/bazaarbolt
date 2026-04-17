"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types";
import { mapOrder, mapQuerySnapshot } from "@/lib/mappers";

export default function RiderEarnings() {
  const { user } = useAuth();
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "orders"),
      where("riderId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      try {
        const mapped = mapQuerySnapshot(snap, mapOrder).filter(o => o.status === "DELIVERED");
        setCompletedOrders(mapped);
      } catch (e) {
        console.error("Mapping error in Earnings:", e);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const totalEarnings = completedOrders.reduce((acc, order) => acc + (order.deliveryCharge || 30), 0);

  if (loading) return (
     <div className="space-y-6 pt-10">
        <div className="h-64 bg-white rounded-[40px] animate-pulse" />
        <div className="h-40 bg-white rounded-[40px] animate-pulse" />
     </div>
  );

  return (
    <div className="space-y-8 pb-20">
       <div className="px-2">
          <h2 className="text-3xl font-headline font-black text-zinc-900 tracking-tight">Earnings</h2>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">WALLET SUMMARY</p>
       </div>

       <section className="bg-zinc-900 rounded-[40px] p-8 text-white relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-bl-[100px] pointer-events-none"></div>
          <div className="relative z-10">
             <span className="text-[10px] font-black text-primary uppercase tracking-widest block mb-2">Total Balance</span>
             <h3 className="text-5xl font-headline font-black tracking-tighter">₹{totalEarnings.toFixed(2)}</h3>
             <div className="mt-8 pt-8 border-t border-white/10 flex justify-between items-center">
                <div>
                   <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Completed Jobs</p>
                   <p className="text-xl font-headline font-black uppercase tracking-widest">{completedOrders.length}</p>
                </div>
                <div className="bg-white/10 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest border border-white/20">Cash Only</div>
             </div>
          </div>
       </section>

       <section className="space-y-4">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Job History</h3>
          {completedOrders.length === 0 ? (
             <p className="text-center py-10 text-zinc-400 text-xs font-bold font-headline uppercase tracking-widest">No payout history yet</p>
          ) : (
             completedOrders.map(order => (
                <div key={order.id} className="bg-white rounded-[32px] p-6 border border-zinc-100 flex items-center justify-between shadow-sm">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-green-500">
                         <span className="material-symbols-outlined font-black">check_circle</span>
                      </div>
                      <div>
                         <p className="text-xs font-black text-zinc-900 uppercase tracking-tighter leading-none">#{order.id?.slice(-8).toUpperCase()}</p>
                         <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-sm font-headline font-black text-zinc-900 leading-none">+₹{(order.deliveryCharge || 30).toFixed(0)}</p>
                      <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mt-1">Delivery Fee</p>
                   </div>
                </div>
             ))
          )}
       </section>
    </div>
  );
}
