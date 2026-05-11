"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types";
import { mapOrder, mapQuerySnapshot } from "@/lib/mappers";
import { motion, AnimatePresence } from "framer-motion";

export default function RiderEarnings() {
  const { user } = useAuth();
  const [allCompletedOrders, setAllCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'all'>('week');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "orders"),
      where("riderId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      try {
        const mapped = mapQuerySnapshot(snap, mapOrder).filter(o => o.status === "DELIVERED");
        setAllCompletedOrders(mapped);
      } catch (e) {
        console.error("Mapping error in Earnings:", e);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    return allCompletedOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      if (timeFilter === 'today') {
        return orderDate.toDateString() === now.toDateString();
      }
      if (timeFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return orderDate >= weekAgo;
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allCompletedOrders, timeFilter]);

  const totalEarnings = filteredOrders.reduce((acc, order) => acc + (order.deliveryCharge || 30), 0);

  const graphData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toDateString();
    }).reverse();

    return last7Days.map(dayStr => {
      const dayOrders = allCompletedOrders.filter(o => new Date(o.createdAt).toDateString() === dayStr);
      const dayEarnings = dayOrders.reduce((acc, o) => acc + (o.deliveryCharge || 30), 0);
      return {
        label: new Date(dayStr).toLocaleDateString('en-US', { weekday: 'short' }),
        value: dayEarnings
      };
    });
  }, [allCompletedOrders]);

  const maxVal = Math.max(...graphData.map(d => d.value), 100);

  if (loading) return (
    <div className="space-y-6 pt-10">
      <div className="h-64 bg-white rounded-[40px] animate-pulse"/>
      <div className="h-40 bg-white rounded-[40px] animate-pulse"/>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="px-2 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-headline font-black text-zinc-900 tracking-tight">Analytics</h2>
          <p className="text-[10px] font-black text-zinc-400 tracking-widest mt-1 uppercase">RIDER PERFORMANCE</p>
        </div>
        <div className="flex bg-zinc-100 p-1 rounded-2xl">
          {(['today', 'week', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                timeFilter === f ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Card */}
      <section className="bg-zinc-900 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-bl-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 grid grid-cols-2 gap-8 mb-8">
          <div>
            <span className="text-[10px] font-black text-primary tracking-widest block mb-1 uppercase">Earnings ({timeFilter})</span>
            <h3 className="text-4xl font-headline font-black tracking-tighter">₹{totalEarnings.toFixed(0)}</h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-zinc-500 tracking-widest block mb-1 uppercase">Deliveries</span>
            <h3 className="text-4xl font-headline font-black tracking-tighter">{filteredOrders.length}</h3>
          </div>
        </div>

        {/* Weekly Graph */}
        <div className="relative z-10 pt-4">
          <div className="flex items-end justify-between h-32 gap-2 px-1">
            {graphData.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="relative w-full flex flex-col justify-end h-full">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(day.value / maxVal) * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 15, delay: i * 0.05 }}
                    className={`w-full rounded-t-lg transition-colors ${day.value > 0 ? 'bg-primary' : 'bg-zinc-800'}`}
                  />
                  {day.value > 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-zinc-900 text-[8px] font-black px-1.5 py-0.5 rounded shadow-xl whitespace-nowrap z-20">
                      ₹{day.value}
                    </div>
                  )}
                </div>
                <span className="text-[8px] font-black text-zinc-600 uppercase">{day.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">Job History</h3>
          <span className="text-[10px] font-black text-zinc-400 bg-zinc-100 px-2 py-1 rounded-lg">{filteredOrders.length} Completed</span>
        </div>
        
        <AnimatePresence mode="popLayout">
          {filteredOrders.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 bg-zinc-50 rounded-[32px] border border-dashed border-zinc-200"
            >
              <span className="material-symbols-outlined text-zinc-300 text-4xl mb-2">history</span>
              <p className="text-center text-zinc-400 text-[10px] font-black uppercase tracking-widest">No payout history for this period</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order, idx) => (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-[24px] p-5 border border-zinc-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
                      <span className="material-symbols-outlined font-black text-lg">verified</span>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-zinc-900 tracking-tight leading-none">#{order.id?.slice(-8).toUpperCase()}</p>
                      <p className="text-[9px] font-bold text-zinc-400 mt-1">
                        {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-headline font-black text-zinc-900 leading-none">+₹{(order.deliveryCharge || 30).toFixed(0)}</p>
                    <p className="text-[8px] font-black text-primary tracking-widest mt-1 uppercase">Fee Earned</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
