"use client";

import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, query, where, onSnapshot, orderBy, limit, getDocs } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Order } from "@/types";
import { mapOrder } from "@/lib/mappers";
import toast from "react-hot-toast";
import Link from "next/link";

export default function VendorDashboard() {
  const { user, userData } = useAuth();
  const [vendorStatus, setVendorStatus] = useState<"online" | "offline">("offline");
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayEarnings: 0,
    pendingOrders: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (userData) {
      setVendorStatus(userData.vendorStatus || "offline");
    }
  }, [userData]);

  useEffect(() => {
    if (!user) return;

    // Fetch stats and orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersQ = query(
      collection(db, "orders"),
      where("vendorId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(ordersQ, (snapshot) => {
      const orders = snapshot.docs.map(mapOrder);
      setRecentOrders(orders);
      
      const pending = orders.filter(o => o.status === "pending").length;
      setStats(prev => ({ ...prev, pendingOrders: pending }));
    });

    // Fetch today's summary
    const fetchTodayStats = async () => {
      const q = query(
        collection(db, "orders"),
        where("vendorId", "==", user.uid),
        where("createdAt", ">=", today.toISOString())
      );
      const snaps = await getDocs(q);
      const orders = snaps.docs.map(mapOrder);
      const earnings = orders
        .filter(o => o.status === "DELIVERED")
        .reduce((acc, o) => acc + (o.total || 0), 0);
      
      setStats(prev => ({
        ...prev,
        todayOrders: orders.length,
        todayEarnings: earnings
      }));
    };

    fetchTodayStats();

    return () => unsubscribe();
  }, [user]);

  const toggleStatus = async () => {
    if (!user) return;
    const newStatus = vendorStatus === "online" ? "offline" : "online";
    try {
      await updateDoc(doc(db, "users", user.uid), {
        vendorStatus: newStatus
      });
      setVendorStatus(newStatus);
      toast.success(`You are now ${newStatus.toUpperCase()}`);
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Availability Card */}
      <div className={`p-6 rounded-[32px] border transition-all duration-500 ${vendorStatus === 'online' ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5' : 'bg-white border-zinc-100'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${vendorStatus === 'online' ? 'bg-primary text-white animate-pulse' : 'bg-zinc-100 text-zinc-400'}`}>
              <span className="material-symbols-outlined text-2xl">{vendorStatus === 'online' ? 'bolt' : 'power_off'}</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-900 tracking-tight leading-none">
                {vendorStatus === 'online' ? 'Accepting Orders' : 'Store Offline'}
              </h2>
              <p className="text-[10px] font-bold text-zinc-400 tracking-widest mt-1 uppercase">
                {vendorStatus === 'online' ? 'Customers can see your products' : 'New orders are blocked'}
              </p>
            </div>
          </div>
          <button 
            onClick={toggleStatus}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] tracking-widest transition-all active:scale-95 ${vendorStatus === 'online' ? 'bg-zinc-900 text-white' : 'bg-primary text-zinc-900 shadow-xl shadow-primary/20'}`}
          >
            {vendorStatus === 'online' ? 'GO OFFLINE' : 'GO ONLINE'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[32px] border border-zinc-100">
          <span className="material-symbols-outlined text-zinc-400 text-2xl mb-2">analytics</span>
          <p className="text-[9px] font-black text-zinc-400 tracking-widest uppercase">Today's Orders</p>
          <h3 className="text-2xl font-black text-zinc-900">{stats.todayOrders}</h3>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-zinc-100">
          <span className="material-symbols-outlined text-zinc-400 text-2xl mb-2">payments</span>
          <p className="text-[9px] font-black text-zinc-400 tracking-widest uppercase">Today's Earnings</p>
          <h3 className="text-2xl font-black text-zinc-900">₹{stats.todayEarnings}</h3>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/vendor/orders" className="bg-white p-4 rounded-[28px] border border-zinc-100 flex flex-col items-center gap-2 text-center active:scale-95 transition-all">
          <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">pending_actions</span>
          </div>
          <span className="text-[9px] font-black text-zinc-900 tracking-tight">Active Orders</span>
          {stats.pendingOrders > 0 && <span className="bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full absolute top-2 right-2">{stats.pendingOrders}</span>}
        </Link>
        <Link href="/vendor/products" className="bg-white p-4 rounded-[28px] border border-zinc-100 flex flex-col items-center gap-2 text-center active:scale-95 transition-all">
          <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">inventory_2</span>
          </div>
          <span className="text-[9px] font-black text-zinc-900 tracking-tight">Products</span>
        </Link>
        <Link href="/vendor/earnings" className="bg-white p-4 rounded-[28px] border border-zinc-100 flex flex-col items-center gap-2 text-center active:scale-95 transition-all">
          <div className="w-10 h-10 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
          </div>
          <span className="text-[9px] font-black text-zinc-900 tracking-tight">Earnings</span>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-[32px] border border-zinc-100 overflow-hidden">
        <div className="p-6 border-b border-zinc-50 flex items-center justify-between">
          <h3 className="text-sm font-black text-zinc-900 tracking-tight uppercase">Recent Orders</h3>
          <Link href="/vendor/orders" className="text-[10px] font-black text-primary tracking-widest">VIEW ALL</Link>
        </div>
        <div className="divide-y divide-zinc-50">
          {recentOrders.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">No orders yet</p>
            </div>
          ) : (
            recentOrders.map(order => (
              <div key={order.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-zinc-900">#{order.id?.slice(-6).toUpperCase()}</p>
                  <p className="text-[9px] font-bold text-zinc-400 mt-0.5">{order.items.length} Items • ₹{order.total}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase ${
                  order.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                  order.status === 'accepted' ? 'bg-blue-100 text-blue-600' :
                  'bg-zinc-100 text-zinc-500'
                }`}>
                  {order.status}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
