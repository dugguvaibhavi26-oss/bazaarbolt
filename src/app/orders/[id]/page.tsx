"use client";

import { use, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { mapOrder } from "@/lib/mappers";
import { AdUnit } from "@/components/AdUnit";

export default function OrderTracking({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [rider, setRider] = useState<any>(null);

  useEffect(() => {
    const unsubOrder = onSnapshot(doc(db, "orders", resolvedParams.id), (docSnap) => {
      try {
        if (docSnap.exists()) {
          const orderData = mapOrder(docSnap);
          
          // Check for newly unavailable items to show a toast alert
          if (order) {
            const newlyUnavailable = orderData.items.find((item, idx) => 
               item.unavailable && !order.items[idx]?.unavailable
            );
            if (newlyUnavailable) {
              import("react-hot-toast").then(t => 
                t.default.error(`Item Update: ${newlyUnavailable.name} is out of stock. Order total updated.`, {
                  duration: 6000,
                  icon: '⚠️'
                })
              );
            }
          }

          setOrder(orderData);
          
          if (orderData.riderId) {
            const unsubRider = onSnapshot(doc(db, "users", orderData.riderId), (rSnap) => {
              if (rSnap.exists()) setRider(rSnap.data());
            });
            return () => unsubRider();
          }
        }
      } catch (e) {
        console.error("Tracking mapping error:", e);
      }
    });
    return () => unsubOrder();
  }, [resolvedParams.id, order]);

  if (!order) return (
    <div className="min-h-[100dvh] bg-surface flex items-center justify-center space-x-2">
      <div className="w-4 h-4 bg-primary-container rounded-full animate-bounce"></div>
      <div className="w-4 h-4 bg-primary-container rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
      <div className="w-4 h-4 bg-primary-container rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
    </div>
  );

  const getStatusDisplay = () => {
    const status = order.status.toUpperCase();
    switch (status) {
      case "PLACED": return { title: "Order Placed", desc: "Store is packing your items", percent: "w-1/4", icon: "inventory_2", color: "text-blue-600" };
      case "ACCEPTED": return { title: "Rider Assigned", desc: "Heading to the store", percent: "w-2/4", icon: "delivery_dining", color: "text-primary" };
      case "PICKED": return { title: "Picked Up", desc: "Rider has your package", percent: "w-3/4", icon: "shopping_basket", color: "text-orange-500" };
      case "ON_THE_WAY": return { title: "On The Way", desc: "Rider is nearby!", percent: "w-[90%]", icon: "bolt", color: "text-primary" };
      case "DELIVERED": return { title: "Delivered", desc: "Enjoy your items!", percent: "w-full", icon: "task_alt", color: "text-green-600" };
      default: return { title: order.status, desc: "Processing...", percent: "w-1/4", icon: "pending_actions", color: "text-zinc-500" };
    }
  };

  const statusInfo = getStatusDisplay();
  const isDelivered = order.status.toUpperCase() === "DELIVERED";

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] border-b border-zinc-100">
        <div className="flex items-center justify-between px-4 py-4 w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/orders')} className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors">
              <span className="material-symbols-outlined text-zinc-900 font-bold">arrow_back</span>
            </button>
            <div className="flex flex-col leading-none">
              <span className="font-headline font-black tracking-tight text-lg text-zinc-900 leading-none">Order Status</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">ID: #{order.id?.slice(-8).toUpperCase()}</span>
            </div>
          </div>
          <button onClick={() => router.push('/help')} className="text-[10px] font-black text-primary px-3 py-1.5 bg-primary/10 rounded-lg tracking-widest uppercase border border-primary/20">Get Help</button>
        </div>
      </header>

      <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-6 text-[#1A1A1A]">
        
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.08)] border border-zinc-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] pointer-events-none"></div>
          
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1 text-[#1A1A1A]">
              <h2 className="font-headline font-black text-3xl tracking-tighter text-zinc-900 leading-[1.1] mb-2">
                {isDelivered ? "Delivered With Love! 💛" : statusInfo.title}
              </h2>
              <p className="font-headline font-bold text-sm text-zinc-500">{statusInfo.desc}</p>
            </div>
            {!isDelivered ? (
              <div className="w-16 h-16 shrink-0 bg-primary/10 rounded-2xl flex items-center justify-center animate-pulse">
                 <span className={`material-symbols-outlined text-4xl font-bold ${statusInfo.color}`} style={{fontVariationSettings: "'FILL' 1"}}>{statusInfo.icon}</span>
              </div>
            ) : (
              <div className="w-16 h-16 shrink-0 bg-green-50 rounded-2xl flex items-center justify-center">
                 <span className="material-symbols-outlined text-4xl font-bold text-green-600" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
              </div>
            )}
          </div>

          <div className="relative h-2.5 bg-zinc-100 rounded-full overflow-hidden mb-8">
            <div className={`absolute top-0 left-0 h-full bg-primary rounded-full ${statusInfo.percent} transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(34,197,94,0.4)]`}></div>
          </div>

          {!isDelivered && (
            <div className="bg-zinc-50 border border-zinc-100 py-3.5 px-6 rounded-2xl flex items-center justify-between">
              <span className="font-headline font-black text-[10px] uppercase tracking-widest text-zinc-400">Delivery PIN</span>
              <span className="font-headline font-black text-3xl tracking-[0.2em] text-zinc-900">{order.deliveryCode}</span>
            </div>
          )}
        </div>

        {!isDelivered && rider && (
          <div className="bg-white rounded-[32px] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] border border-zinc-100 overflow-hidden">
            <div className="h-24 bg-zinc-50 flex items-center justify-center border-b border-zinc-100 relative">
               <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '20px 20px'}}></div>
               <span className="material-symbols-outlined text-zinc-400 text-3xl animate-bounce" style={{fontVariationSettings: "'FILL' 1"}}>motorcycle</span>
               <span className="text-zinc-500 font-black text-xs uppercase tracking-widest ml-3">Rider Is Flying To You</span>
            </div>

            <div className="px-6 py-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-zinc-100 rounded-full border-2 border-primary/20 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                   <span className="material-symbols-outlined text-zinc-400 text-3xl">account_circle</span>
                </div>
                <div>
                  <h3 className="font-headline font-black text-lg text-zinc-900 leading-none mb-1.5">{rider.name || "Bolt Rider"}</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      <span className="material-symbols-outlined text-[12px] text-yellow-500" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                      4.9 Rating
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      <span className="material-symbols-outlined text-[12px] text-primary" style={{fontVariationSettings: "'FILL' 1"}}>bolt</span>
                      Electric
                    </div>
                  </div>
                </div>
              </div>
              <a href={`tel:${rider.phone || '0000000000'}`} className="w-12 h-12 bg-primary/10 text-primary hover:bg-primary-container active:scale-90 transition-all rounded-2xl flex items-center justify-center shadow-sm border border-primary/20 group">
                <span className="material-symbols-outlined font-black group-hover:scale-110 transition-transform">call</span>
              </a>
            </div>
          </div>
        )}

        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] border border-zinc-100">
          <h3 className="font-headline font-black text-xs uppercase tracking-widest text-[#1A1A1A] mb-6 flex items-center gap-2">
             <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
             Order Summary
          </h3>
          <div className="space-y-5">
            {order.items.map(item => (
              <div key={item.id} className={`flex items-center gap-4 text-[#1A1A1A] ${item.unavailable ? 'opacity-50' : ''}`}>
                <div className="w-12 h-12 shrink-0 bg-zinc-50 rounded-xl p-2 border border-zinc-100 transition-transform hover:scale-105">
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain drop-shadow-sm" />
                </div>
                <div className="flex-grow">
                  <p className={`font-headline font-black text-sm text-zinc-900 leading-none mb-1 ${item.unavailable ? 'line-through' : ''}`}>{item.name}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Qty: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <span className={`font-headline font-black text-sm text-zinc-900 block ${item.unavailable ? 'line-through' : ''}`}>₹{(item.price * item.quantity).toFixed(2)}</span>
                  {item.unavailable && <span className="text-[8px] font-black text-red-500 uppercase">Unavailable</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-100 space-y-3">
             <div className="flex justify-between items-center text-[#1A1A1A]">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Subtotal</span>
                <span className="text-sm font-black text-zinc-600">₹{order.subtotal?.toFixed(2) || (order.total - (order.tax || 0)).toFixed(2)}</span>
             </div>
             <div className="flex justify-between items-center text-[#1A1A1A]">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Taxes & Fees</span>
                <span className="text-sm font-black text-zinc-600">₹{order.tax?.toFixed(2) || "0.00"}</span>
             </div>
             <div className="flex justify-between items-center pt-3 mt-1 border-t border-zinc-100 text-[#1A1A1A]">
                <div className="flex flex-col">
                   <span className="text-sm font-headline font-black text-zinc-900 uppercase tracking-tighter">Total Amount</span>
                   <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Via {order.paymentMethod === 'COD' ? 'Cash' : 'Online'}</span>
                </div>
                <span className="text-2xl font-headline font-black text-zinc-900 tracking-tighter">₹{order.total.toFixed(2)}</span>
             </div>
          </div>
        </div>

        {/* Unavailable Items Notice */}
        {order.items.some(i => i.unavailable) && (
          <div className="bg-red-50 rounded-[32px] p-8 border border-red-100 space-y-4 mb-8">
             <div className="flex items-center gap-3 text-red-600 mb-2">
                <span className="material-symbols-outlined font-black">sentiment_dissatisfied</span>
                <h3 className="font-headline font-black text-xs uppercase tracking-widest">Stock Update</h3>
             </div>
             <p className="text-xs font-bold text-red-900 leading-relaxed">
               We're sorry we can't deliver these products to you because they are not available in the store right now. Your order total has been adjusted accordingly.
             </p>
             <div className="space-y-2 pt-2">
                {order.items.filter(i => i.unavailable).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[10px] font-black text-red-400 uppercase">
                    <span>{item.name}</span>
                    <span>Out of Stock</span>
                  </div>
                ))}
             </div>
          </div>
        )}

        <AdUnit slotId="order-tracking-bottom" className="mt-8" />
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] z-50 bg-white/95 backdrop-blur-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] border border-white/40 rounded-full px-6 py-3 flex justify-between items-center transition-all">
          <button onClick={() => router.push("/")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-all">
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">home</span>
            <span className="font-headline text-[9px] font-black uppercase tracking-widest mt-1">Home</span>
          </button>
          
          <button onClick={() => router.push("/orders")} className="flex flex-col items-center justify-center text-zinc-900 group active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform" style={{fontVariationSettings: "'FILL' 1"}}>inventory_2</span>
            <span className="font-headline text-[9px] font-black uppercase tracking-widest mt-1 text-zinc-900">Orders</span>
          </button>
          
          <button onClick={() => router.push("/help")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-all">
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">support_agent</span>
            <span className="font-headline text-[9px] font-black uppercase tracking-widest mt-1">Helpdesk</span>
          </button>

          <button onClick={() => router.push("/profile")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-all">
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">account_circle</span>
            <span className="font-headline text-[9px] font-black uppercase tracking-widest mt-1">Profile</span>
          </button>
      </nav>
    </>
  );
}
