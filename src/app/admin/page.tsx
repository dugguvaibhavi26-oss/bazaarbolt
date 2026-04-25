"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types";
import Link from "next/link";
import toast from "react-hot-toast";
import { OrderService } from "@/services/orderService";
import { mapOrder, mapQuerySnapshot } from "@/lib/mappers";
import { query, where } from "firebase/firestore";

export default function AdminDashboard() {
 const [orders, setOrders] = useState<Order[]>([]);
 const [vendors, setVendors] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const unsub = onSnapshot(collection(db, "orders"), (snap) => {
 try {
 const ords = mapQuerySnapshot(snap, mapOrder);
 setOrders(ords);
 } catch (e) {
 console.error("Dashboard mapping error:", e);
 }
 setLoading(false);
 }, (error) => {
 console.error("Dashboard snapshot error:", error);
 // Silent error for dashboard to avoid spamming the user if they are navigating
 setLoading(false);
 });

 const interval = setInterval(() => {
 OrderService.cleanupExpiredOrders();
 }, 30000);

 const unsubVendors = onSnapshot(query(collection(db, "users"), where("role", "==", "vendor")), (snap) => {
   setVendors(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
 });

 return () => {
 unsub();
 unsubVendors();
 clearInterval(interval);
 };
 }, []);

 const today = new Date().toISOString().split('T')[0];
 const todayOrders = orders.filter(o => o.createdAt.startsWith(today));
 const pendingOrders = orders.filter(o => !["DELIVERED", "CANCELLED"].includes(o.status));
 const recentOrders = [...orders].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
 const revenueToday = todayOrders.reduce((acc, o) => acc + o.total, 0);

 const stats = [
 { label: "Today's Volume", value: todayOrders.length, icon: "analytics", color: "bg-blue-50 text-blue-600", trend: "+12%"},
 { label: "Active Queue", value: pendingOrders.length, icon: "assignment_late", color: "bg-orange-50 text-orange-600", trend: "Live"},
 { label: "Daily Revenue", value:`₹${revenueToday.toFixed(0)}`, icon: "payments", color: "bg-emerald-50 text-emerald-600", trend: "COD"},
 { label: "Live Vendors", value: vendors.filter(v => v.vendorStatus === 'online').length, icon: "storefront", color: "bg-purple-50 text-purple-600", trend: `${vendors.length} Total`},
 ];

 if (loading) return (
 <div className="space-y-8 animate-pulse">
 <div className="h-8 w-64 bg-white rounded-lg"/>
 <div className="grid grid-cols-4 gap-6">
 {[1,2,3,4].map(n => <div key={n} className="h-32 bg-white rounded-3xl"/>)}
 </div>
 <div className="h-96 bg-white rounded-[40px]"/>
 </div>
 );

 return (
 <div className="space-y-6 lg:space-y-10 pb-32 px-1 lg:px-0">
  <div className="px-2">
   <h1 className="text-2xl lg:text-3xl font-black text-zinc-900 tracking-tight font-headline">Intelligence Hub</h1>
   <p className="text-[10px] lg:text-xs font-bold text-zinc-400 tracking-widest mt-1 uppercase">Performance metrics & system health</p>
  </div>

  {/* Stats Grid */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
   {stats.map((s, idx) => (
    <div key={idx} className="bg-white rounded-[28px] lg:rounded-[32px] p-6 lg:p-8 shadow-sm border border-zinc-100 relative overflow-hidden group hover:shadow-xl transition-all">
     <div className={`w-12 h-12 lg:w-14 lg:h-14 ${s.color} rounded-2xl flex items-center justify-center mb-4 lg:mb-6 group-hover:scale-110 transition-transform`}>
      <span className="material-symbols-outlined text-xl lg:text-2xl font-bold">{s.icon}</span>
     </div>
     <div className="flex justify-between items-end">
      <div>
       <p className="text-[9px] lg:text-[10px] font-black text-zinc-400 tracking-widest mb-1 uppercase">{s.label}</p>
       <h4 className="text-2xl lg:text-3xl font-headline font-black text-zinc-900 tracking-tighter">{s.value}</h4>
      </div>
      <span className={`text-[8px] lg:text-[9px] font-black px-2 py-1 rounded-lg ${s.trend === 'Live' ? 'bg-zinc-900 text-primary animate-pulse' : 'bg-zinc-50 text-zinc-500'}`}>
       {s.trend}
      </span>
     </div>
    </div>
   ))}
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
   {/* Live Order Feed */}
   <div className="lg:col-span-8 bg-white rounded-[32px] lg:rounded-[40px] p-6 lg:p-10 border border-zinc-100 shadow-sm relative overflow-hidden">
    <div className="flex items-center justify-between mb-6 lg:mb-8">
     <h3 className="font-headline font-black text-lg lg:text-xl text-zinc-900 tracking-tight leading-none">Rapid Order Feed</h3>
     <Link href="/admin/orders" className="text-[8px] lg:text-[10px] font-black text-primary bg-zinc-900 px-3 py-2 lg:px-4 lg:py-2 rounded-xl tracking-widest uppercase">History</Link>
    </div>
    <div className="space-y-2">
     {recentOrders.map(order => (
      <div key={order.id} className="flex items-center justify-between p-4 lg:p-6 bg-zinc-50 hover:bg-zinc-100 transition-colors rounded-[24px] lg:rounded-[28px] group">
       <div className="flex items-center gap-3 lg:gap-5 min-w-0">
        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-primary/10 group-hover:text-primary shadow-sm transition-all flex-shrink-0">
         <span className="material-symbols-outlined font-black text-xl lg:text-2xl">bolt</span>
        </div>
        <div className="min-w-0">
         <p className="font-headline font-black text-xs lg:text-sm text-zinc-900 tracking-tight truncate">#{order.id?.slice(-8).toUpperCase()}</p>
         <p className="text-[8px] lg:text-[9px] font-bold text-zinc-400 tracking-widest mt-0.5 lg:mt-1 truncate uppercase">₹{order.total.toFixed(0)} • {order.items.length} Items</p>
        </div>
       </div>
       <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
        <span className={`px-2 lg:px-4 py-1.5 lg:py-2 rounded-lg lg:rounded-xl text-[7px] lg:text-[9px] font-black tracking-widest shadow-sm uppercase
         ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-white text-zinc-900'}
        `}>
         {order.status === 'DELIVERED' ? 'Done' : order.status}
        </span>
        <Link href="/admin/orders" className="w-8 h-8 lg:w-10 lg:h-10 bg-white shadow-sm border border-zinc-200 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors">
         <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
       </div>
      </div>
     ))}
     {recentOrders.length === 0 && (
      <div className="py-20 text-center opacity-30 font-medium text-xs text-zinc-400 uppercase tracking-widest">Listening for orders...</div>
     )}
    </div>
   </div>

   {/* Activity Sidebar */}
   <div className="lg:col-span-4 space-y-6 lg:space-y-8">
    <div className="bg-zinc-900 rounded-[32px] lg:rounded-[40px] p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
     <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
      <span className="material-symbols-outlined text-7xl lg:text-8xl">bolt</span>
     </div>
     <h4 className="font-headline font-black text-base lg:text-lg mb-6 tracking-tight relative z-10 leading-none">Real-time Ops</h4>
     <div className="space-y-6 relative z-10">
      <div className="flex items-center gap-4">
       <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
       <div>
        <p className="text-[10px] lg:text-xs font-black tracking-widest uppercase">Store Gateway Open</p>
        <p className="text-[8px] lg:text-[9px] font-bold text-zinc-500 mt-1 tracking-widest uppercase">Processing Orders</p>
       </div>
      </div>
      <div className="pt-6 border-t border-white/10">
       <div className="flex items-center justify-between mb-4">
        <span className="text-[9px] lg:text-[10px] font-black text-zinc-500 tracking-widest uppercase">Active Riders</span>
        <span className="text-[10px] lg:text-xs font-black text-primary uppercase">12 Ready</span>
       </div>
       <div className="flex items-center justify-between">
        <span className="text-[9px] lg:text-[10px] font-black text-zinc-500 tracking-widest uppercase">Avg Delivery</span>
        <span className="text-[10px] lg:text-xs font-black text-white uppercase">9.4 Mins</span>
       </div>
      </div>
     </div>
    </div>
    <div className="bg-white rounded-[32px] lg:rounded-[40px] p-6 lg:p-8 border border-zinc-100 shadow-sm">
     <h4 className="font-headline font-black text-[9px] lg:text-[10px] tracking-widest text-zinc-400 mb-6 uppercase">Stock Alerts</h4>
     <div className="space-y-3">
      <div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100">
       <span className="text-[9px] lg:text-[10px] font-black text-red-600 tracking-widest uppercase">Amul Gold Milk</span>
       <span className="text-[8px] lg:text-[10px] font-black text-red-400 uppercase">Low</span>
      </div>
      <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
       <span className="text-[9px] lg:text-[10px] font-black text-zinc-500 tracking-widest uppercase">Organic Avocado</span>
       <span className="text-[8px] lg:text-[10px] font-black text-zinc-400 uppercase">Stable</span>
      </div>
     </div>
    </div>
   </div>
  </div>
 </div>
 );
}
