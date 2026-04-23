"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import toast from "react-hot-toast";
import { Order } from "@/types";
import { mapOrder, mapQuerySnapshot } from "@/lib/mappers";
import { useStore } from "@/store/useStore";

export default function AdminOrders() {
 const [orders, setOrders] = useState<Order[]>([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState("ALL");

 useEffect(() => {
 const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
 const unsub = onSnapshot(q, (snap) => {
 try {
 const ords = mapQuerySnapshot(snap, mapOrder);
 setOrders(ords);
 } catch (e) {
 console.error("Mapping error in AdminOrders:", e);
 toast.error("Data corruption detected in orders");
 }
 setLoading(false);
 });
 return () => unsub();
 }, []);

  const { settings } = useStore();

  const updateStatus = async (order: Order, newStatus: string) => {
    try {
      const { triggerNotification } = await import("@/lib/notificationClient");
      const { doc, updateDoc } = await import("firebase/firestore");
      
      await updateDoc(doc(db, "orders", order.id), { status: newStatus });
      toast.success(`Order updated to ${newStatus}`);
      
      let title = `Order ${newStatus}`;
      let body = `Your order status has been updated to ${newStatus}.`;

      if (settings?.notificationTemplates?.[newStatus]) {
        const template = settings.notificationTemplates[newStatus];
        title = template.title;
        body = template.body.replace("{{name}}", order.customerName || "Customer");
      }
      
      triggerNotification({ 
        userId: order.userId, 
        title, 
        body,
        data: { url: "/orders" }
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  };

 const filteredOrders = filter === "ALL"? orders : orders.filter(o => o.status === filter);

 if (loading) return (
 <div className="flex flex-col gap-4 animate-pulse">
 <div className="h-12 bg-white rounded-2xl w-1/3"/>
 <div className="h-64 bg-white rounded-3xl"/>
 </div>
 );

 return (
    <div className="space-y-6 lg:space-y-8 pb-32">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl lg:text-2xl font-black text-zinc-900 tracking-tight">Active Orders</h3>
          <p className="text-[10px] lg:text-xs font-bold text-zinc-400 tracking-widest mt-1 uppercase">Order lifecycle management</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-zinc-200 shadow-sm overflow-x-auto hide-scrollbar max-w-full">
          {["ALL", "PLACED", "ACCEPTED", "PICKED", "DELIVERED", "CANCELLED"].map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-primary text-zinc-900 shadow-sm': 'text-zinc-500 hover:text-zinc-900'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {filteredOrders.map(o => (
          <div key={o.id} className="bg-white rounded-[24px] p-5 border border-zinc-100 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div>
                  <p className="font-headline font-black text-[11px] text-zinc-900 tracking-tight">#{o.id.slice(-8).toUpperCase()}</p>
                  <p className="text-[10px] font-bold text-zinc-400">{o.customerName || "Customer"}</p>
                </div>
              </div>
              <span className="font-headline font-black text-sm text-zinc-900">₹{o.total.toFixed(0)}</span>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-50 pt-4">
              <div className="flex -space-x-2">
                {o.items.slice(0, 3).map((item: any, i: number) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-zinc-100 p-1">
                    <img src={item.image} alt="" className="w-full h-full object-contain" />
                  </div>
                ))}
                {o.items.length > 3 && (
                  <div className="w-7 h-7 rounded-full border-2 border-white bg-zinc-900 text-white text-[7px] font-black flex items-center justify-center">
                    +{o.items.length - 3}
                  </div>
                )}
              </div>
              
              <select 
                value={o.status}
                onChange={(e) => updateStatus(o, e.target.value)}
                className={`px-3 py-1.5 rounded-lg text-[8px] font-black tracking-widest shadow-sm border-none cursor-pointer
                ${o.status === 'DELIVERED'? 'bg-green-100 text-green-700': o.status === 'PICKED'? 'bg-orange-100 text-orange-700': o.status === 'CANCELLED'? 'bg-red-100 text-red-700':
                'bg-blue-100 text-blue-700'}`}
              >
                {["PLACED", "ACCEPTED", "PICKED", "ON_THE_WAY", "DELIVERED", "CANCELLED"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
        {filteredOrders.length === 0 && (
          <div className="p-12 text-center bg-white rounded-[24px] border border-dashed border-zinc-200">
            <span className="material-symbols-outlined text-4xl text-zinc-200 mb-2">inventory_2</span>
            <p className="text-[9px] font-black tracking-widest text-zinc-400">No orders found</p>
          </div>
        )}
      </div>

      <div className="hidden lg:block bg-white rounded-[40px] shadow-sm border border-zinc-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 text-zinc-400">
                <th className="px-8 py-5 text-[10px] font-black tracking-widest">Order / Customer</th>
                <th className="px-8 py-5 text-[10px] font-black tracking-widest">Items & Bag</th>
                <th className="px-8 py-5 text-[10px] font-black tracking-widest">Pricing</th>
                <th className="px-8 py-5 text-[10px] font-black tracking-widest text-center">Lifecycle Status</th>
                <th className="px-8 py-5 text-[10px] font-black tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredOrders.map(o => (
                <tr key={o.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">person</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline font-black text-xs text-zinc-900 tracking-tighter">#{o.id.slice(-8).toUpperCase()}</span>
                        <span className="text-[10px] font-bold text-zinc-500">{o.customerName || o.userId.slice(0,10)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex -space-x-3 overflow-hidden">
                      {o.items.slice(0, 3).map((item: any, i: number) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-zinc-100 p-1 flex items-center justify-center shadow-sm">
                          <img src={item.image} alt=""className="w-full h-full object-contain"/>
                        </div>
                      ))}
                      {o.items.length > 3 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-zinc-900 text-white text-[8px] font-black flex items-center justify-center shadow-sm">
                          +{o.items.length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="font-headline font-black text-sm text-zinc-900 tracking-tight">₹{o.total.toFixed(2)}</span>
                    <p className="text-[9px] font-bold text-zinc-400 mt-1 tracking-widest">{o.paymentMethod || 'COD'}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center">
                      <select 
                        value={o.status}
                        onChange={(e) => updateStatus(o, e.target.value)}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black tracking-widest shadow-sm border-none cursor-pointer
                        ${o.status === 'DELIVERED'? 'bg-green-100 text-green-700': o.status === 'PICKED'? 'bg-orange-100 text-orange-700': o.status === 'CANCELLED'? 'bg-red-100 text-red-700':
                        'bg-blue-100 text-blue-700'}`}
                      >
                        {["PLACED", "ACCEPTED", "PICKED", "ON_THE_WAY", "DELIVERED", "CANCELLED"].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button onClick={() => toast.success(`Viewing Order #${o.id.slice(-4)}`)} className="p-3 bg-zinc-50 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all">
                      <span className="material-symbols-outlined text-sm">visibility</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="p-20 text-center">
              <span className="material-symbols-outlined text-5xl text-zinc-200 mb-4">move_to_inbox</span>
              <p className="text-[10px] font-black tracking-widest text-zinc-400">No Orders in this queue</p>
            </div>
          )}
        </div>
      </div>
 </div>
 );
}
