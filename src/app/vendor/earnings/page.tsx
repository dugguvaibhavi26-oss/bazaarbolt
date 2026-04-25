"use client";

import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Order } from "@/types";
import { mapOrder } from "@/lib/mappers";

export default function VendorEarnings() {
  const { user } = useAuth();
  const [earningsData, setEarningsData] = useState({
    total: 0,
    today: 0,
    week: 0,
    month: 0
  });
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchEarnings = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "orders"),
          where("vendorId", "==", user.uid),
          where("status", "==", "DELIVERED"),
          orderBy("createdAt", "desc")
        );
        const snaps = await getDocs(q);
        const orders = snaps.docs.map(mapOrder);
        setCompletedOrders(orders);

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const week = today - (7 * 24 * 60 * 60 * 1000);
        const month = today - (30 * 24 * 60 * 60 * 1000);

        let total = 0, t = 0, w = 0, m = 0;

        orders.forEach(o => {
          const time = new Date(o.createdAt || "").getTime();
          const amount = o.total || 0;
          total += amount;
          if (time >= today) t += amount;
          if (time >= week) w += amount;
          if (time >= month) m += amount;
        });

        setEarningsData({ total, today: t, week: w, month: m });
      } catch (e) {
        console.error("Earnings fetch error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-zinc-900 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-10 opacity-10 -z-0">
          <span className="material-symbols-outlined text-[120px]">account_balance_wallet</span>
        </div>
        <p className="text-[10px] font-black text-white/50 tracking-[0.3em] uppercase mb-2">Total Balance</p>
        <h2 className="text-4xl font-black tracking-tight mb-8">₹{earningsData.total.toLocaleString()}</h2>
        
        <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
          <div>
            <p className="text-[8px] font-black text-white/40 tracking-widest uppercase mb-1">Today</p>
            <p className="text-sm font-black">₹{earningsData.today}</p>
          </div>
          <div>
            <p className="text-[8px] font-black text-white/40 tracking-widest uppercase mb-1">This Week</p>
            <p className="text-sm font-black">₹{earningsData.week}</p>
          </div>
          <div>
            <p className="text-[8px] font-black text-white/40 tracking-widest uppercase mb-1">This Month</p>
            <p className="text-sm font-black">₹{earningsData.month}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase ml-2">Payment History</h3>
        {completedOrders.length === 0 ? (
          <div className="py-10 text-center bg-white rounded-[32px] border border-zinc-100">
             <p className="text-[10px] font-black text-zinc-300 tracking-widest uppercase">No earnings history</p>
          </div>
        ) : (
          completedOrders.map(order => (
            <div key={order.id} className="bg-white p-5 rounded-[28px] border border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">check_circle</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-900 uppercase tracking-tight">Order #{order.id?.slice(-6).toUpperCase()}</p>
                  <p className="text-[9px] font-bold text-zinc-400 mt-0.5">{new Date(order.createdAt || "").toLocaleDateString()}</p>
                </div>
              </div>
              <p className="text-sm font-black text-zinc-900">+₹{order.total}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
