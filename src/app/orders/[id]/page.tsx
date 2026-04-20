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
 const newlyUnavailable = orderData.items.find((item, idx) => item.unavailable && !order.items[idx]?.unavailable
 );
 if (newlyUnavailable) {
 import("react-hot-toast").then(t => t.default.error(`ITEM UPDATE: ${newlyUnavailable.name.toUpperCase()} IS OUT OF STOCK. ORDER TOTAL UPDATED.`, {
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
 <div className="w-4 h-4 bg-primary-container rounded-full animate-bounce"style={{ animationDelay: "0.1s"}}></div>
 <div className="w-4 h-4 bg-primary-container rounded-full animate-bounce"style={{ animationDelay: "0.2s"}}></div>
 </div>
 );

 const getStatusDisplay = () => {
 const status = order.status.toUpperCase();
 switch (status) {
 case "PLACED": return { title: "Order Placed", desc: "Store is packing your items", percent: "w-1/4", icon: "inventory_2", color: "text-blue-600"};
 case "ACCEPTED": return { title: "Rider Assigned", desc: "Heading to the store", percent: "w-2/4", icon: "delivery_dining", color: "text-primary"};
 case "PICKED": return { title: "Picked Up", desc: "Rider has your package", percent: "w-3/4", icon: "shopping_basket", color: "text-orange-500"};
 case "ON_THE_WAY": return { title: "On The Way", desc: "Rider is nearby!", percent: "w-[90%]", icon: "bolt", color: "text-primary"};
 case "DELIVERED": return { title: "Delivered", desc: "Enjoy your items!", percent: "w-full", icon: "task_alt", color: "text-green-600"};
 default: return { title: order.status, desc: "Processing...", percent: "w-1/4", icon: "pending_actions", color: "text-zinc-500"};
 }
 };

 const statusInfo = getStatusDisplay();
 const isDelivered = order.status.toUpperCase() === "DELIVERED";

 return (
 <>
 <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] border-b border-zinc-100 uppercase">
 <div className="flex items-center justify-between px-4 py-4 w-full max-w-2xl mx-auto uppercase">
 <div className="flex items-center gap-4 uppercase">
 <button onClick={() => router.push('/orders')} className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors uppercase">
 <span className="material-symbols-outlined text-zinc-900 font-bold uppercase">arrow_back</span>
 </button>
 <div className="flex flex-col leading-none uppercase">
 <span className="font-headline font-black tracking-tight text-lg text-zinc-900 leading-none uppercase">Order Status</span>
 <span className="text-[10px] font-bold text-zinc-400 tracking-widest mt-1 uppercase">ID: #{order.id?.slice(-8).toUpperCase()}</span>
 </div>
 </div>
 <button onClick={() => router.push('/help')} className="text-[10px] font-black text-primary px-3 py-1.5 bg-primary/10 rounded-lg tracking-widest border border-primary/20 uppercase">Get Help</button>
 </div>
 </header>

 <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-6 text-[#1A1A1A] uppercase">
 <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.08)] border border-zinc-100 relative overflow-hidden uppercase">
 <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] pointer-events-none uppercase"></div>
 <div className="flex justify-between items-start mb-8 uppercase">
 <div className="flex-1 text-[#1A1A1A] uppercase">
 <h2 className="font-headline font-black text-3xl tracking-tighter text-zinc-900 leading-[1.1] mb-2 uppercase">
 {isDelivered ? "Delivered With Love! 💛": statusInfo.title}
 </h2>
 <p className="font-headline font-bold text-sm text-zinc-500 uppercase">{statusInfo.desc}</p>
 </div>
 {!isDelivered ? (
 <div className="w-16 h-16 shrink-0 bg-primary/10 rounded-2xl flex items-center justify-center animate-pulse uppercase">
 <span className={`material-symbols-outlined text-4xl font-bold uppercase ${statusInfo.color}`} style={{fontVariationSettings: "'FILL'1"}}>{statusInfo.icon}</span>
 </div>
 ) : (
 <div className="w-16 h-16 shrink-0 bg-green-50 rounded-2xl flex items-center justify-center uppercase">
 <span className="material-symbols-outlined text-4xl font-bold text-green-600 uppercase"style={{fontVariationSettings: "'FILL'1"}}>verified</span>
 </div>
 )}
 </div>

 <div className="relative h-2.5 bg-zinc-100 rounded-full overflow-hidden mb-8 uppercase">
 <div className={`absolute top-0 left-0 h-full bg-primary rounded-full ${statusInfo.percent} transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(34,197,94,0.4)] uppercase`}></div>
 </div>

 {!isDelivered && (
 <div className="bg-zinc-50 border border-zinc-100 py-3.5 px-6 rounded-2xl flex items-center justify-between uppercase">
 <span className="font-headline font-black text-[10px] tracking-widest text-zinc-400 uppercase">Delivery PIN</span>
 <span className="font-headline font-black text-3xl tracking-[0.2em] text-zinc-900 uppercase">{order.deliveryCode}</span>
 </div>
 )}
 </div>

 {!isDelivered && rider && (
 <div className="bg-white rounded-[32px] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] border border-zinc-100 overflow-hidden uppercase">
 <div className="h-24 bg-zinc-50 flex items-center justify-center border-b border-zinc-100 relative uppercase">
 <div className="absolute inset-0 opacity-10 pointer-events-none uppercase"style={{backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '20px 20px'}}></div>
 <span className="material-symbols-outlined text-zinc-400 text-3xl animate-bounce uppercase"style={{fontVariationSettings: "'FILL'1"}}>motorcycle</span>
 <span className="text-zinc-500 font-black text-xs tracking-widest ml-3 uppercase">Rider Is Flying To You</span>
 </div>

 <div className="px-6 py-6 flex items-center justify-between uppercase">
 <div className="flex items-center gap-4 uppercase">
 <div className="w-14 h-14 bg-zinc-100 rounded-full border-2 border-primary/20 overflow-hidden shrink-0 flex items-center justify-center shadow-inner uppercase">
 <span className="material-symbols-outlined text-zinc-400 text-3xl uppercase">account_circle</span>
 </div>
 <div className="uppercase">
 <h3 className="font-headline font-black text-lg text-zinc-900 leading-none mb-1.5 uppercase">{rider.name || "Bolt Rider"}</h3>
 <div className="flex items-center gap-3 uppercase">
 <div className="flex items-center gap-1 text-[10px] font-black text-zinc-500 tracking-widest uppercase">
 <span className="material-symbols-outlined text-[12px] text-yellow-500 uppercase"style={{fontVariationSettings: "'FILL'1"}}>star</span>
 4.9 Rating
 </div>
 <div className="flex items-center gap-1 text-[10px] font-black text-zinc-500 tracking-widest uppercase">
 <span className="material-symbols-outlined text-[12px] text-primary uppercase"style={{fontVariationSettings: "'FILL'1"}}>bolt</span>
 Electric
 </div>
 </div>
 </div>
 </div>
 <a href={`tel:${rider.phone || '0000000000'}`} className="w-12 h-12 bg-primary/10 text-primary hover:bg-primary-container active:scale-90 transition-all rounded-2xl flex items-center justify-center shadow-sm border border-primary/20 group uppercase">
 <span className="material-symbols-outlined font-black group-hover:scale-110 transition-transform uppercase">call</span>
 </a>
 </div>
 </div>
 )}

 <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] border border-zinc-100 uppercase">
 <h3 className="font-headline font-black text-xs tracking-widest text-[#1A1A1A] mb-6 flex items-center gap-2 uppercase">
 <span className="material-symbols-outlined text-[20px] uppercase">shopping_bag</span>
 Order Summary
 </h3>
 <div className="space-y-5 uppercase">
 {order.items.map(item => (
 <div key={item.id} className={`flex items-center gap-4 text-[#1A1A1A] ${item.unavailable ? 'opacity-50': ''} uppercase`}>
 <div className="w-12 h-12 shrink-0 bg-zinc-50 rounded-xl p-2 border border-zinc-100 transition-transform hover:scale-105 uppercase">
 <img src={item.image} alt={item.name} className="w-full h-full object-contain drop-shadow-sm uppercase"/>
 </div>
 <div className="flex-grow uppercase">
 <p className={`font-headline font-black text-sm text-zinc-900 leading-none mb-1 uppercase ${item.unavailable ? 'line-through': ''}`}>{item.name}</p>
 <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Qty: {item.quantity}</p>
 </div>
 <div className="text-right uppercase">
 <span className={`font-headline font-black text-sm text-zinc-900 block uppercase ${item.unavailable ? 'line-through': ''}`}>₹{(item.price * item.quantity).toFixed(2)}</span>
 {item.unavailable && <span className="text-[8px] font-black text-red-500 uppercase">Unavailable</span>}
 </div>
 </div>
 ))}
 </div>

 <div className="mt-8 pt-6 border-t border-zinc-100 space-y-3 uppercase">
 <div className="flex justify-between items-center text-[#1A1A1A] uppercase">
 <span className="text-xs font-bold text-zinc-400 tracking-widest uppercase">Subtotal</span>
 <span className="text-sm font-black text-zinc-600 uppercase">₹{order.subtotal?.toFixed(2) || (order.total - (order.tax || 0)).toFixed(2)}</span>
 </div>
 <div className="flex justify-between items-center text-[#1A1A1A] uppercase">
 <span className="text-xs font-bold text-zinc-400 tracking-widest uppercase">Taxes & Fees</span>
 <span className="text-sm font-black text-zinc-600 uppercase">₹{order.tax?.toFixed(2) || "0.00"}</span>
 </div>
 <div className="flex justify-between items-center pt-3 mt-1 border-t border-zinc-100 text-[#1A1A1A] uppercase">
 <div className="flex flex-col uppercase">
 <span className="text-sm font-headline font-black text-zinc-900 tracking-tighter uppercase">Total Amount</span>
 <span className="text-[9px] font-bold text-primary tracking-widest uppercase">Via {order.paymentMethod === 'COD'? 'Cash': 'Online'}</span>
 </div>
 <span className="text-2xl font-headline font-black text-zinc-900 tracking-tighter uppercase">₹{order.total.toFixed(2)}</span>
 </div>
 </div>
 </div>

 {/* Unavailable Items Notice */}
 {order.items.some(i => i.unavailable) && (
 <div className="bg-red-50 rounded-[32px] p-8 border border-red-100 space-y-4 mb-8 uppercase">
 <div className="flex items-center gap-3 text-red-600 mb-2 uppercase">
 <span className="material-symbols-outlined font-black uppercase">sentiment_dissatisfied</span>
 <h3 className="font-headline font-black text-xs tracking-widest uppercase">Stock Update</h3>
 </div>
 <p className="text-xs font-bold text-red-900 leading-relaxed uppercase">
 We're sorry we can't deliver these products to you because they are not available in the store right now. Your order total has been adjusted accordingly.
 </p>
 <div className="space-y-2 pt-2 uppercase">
 {order.items.filter(i => i.unavailable).map((item, idx) => (
 <div key={idx} className="flex justify-between items-center text-[10px] font-black text-red-400 uppercase">
 <span className="uppercase">{item.name}</span>
 <span className="uppercase">Out of Stock</span>
 </div>
 ))}
 </div>
 </div>
 )}

 <AdUnit slotId="order-tracking-bottom"className="mt-8 uppercase"/>
 </main>

 <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] z-50 bg-white/95 backdrop-blur-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] border border-white/40 rounded-full px-6 py-3 flex justify-between items-center transition-all uppercase">
 <button onClick={() => router.push("/")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-all uppercase">
 <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform uppercase">home</span>
 <span className="font-headline text-[9px] font-black tracking-widest mt-1 uppercase">Home</span>
 </button>
 <button onClick={() => router.push("/orders")} className="flex flex-col items-center justify-center text-zinc-900 group active:scale-95 transition-transform uppercase">
 <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform uppercase"style={{fontVariationSettings: "'FILL'1"}}>inventory_2</span>
 <span className="font-headline text-[9px] font-black tracking-widest mt-1 text-zinc-900 uppercase">Orders</span>
 </button>
 <button onClick={() => router.push("/help")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-all uppercase">
 <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform uppercase">support_agent</span>
 <span className="font-headline text-[9px] font-black tracking-widest mt-1 uppercase">Helpdesk</span>
 </button>

 <button onClick={() => router.push("/profile")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-all uppercase">
 <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform uppercase">account_circle</span>
 <span className="font-headline text-[9px] font-black tracking-widest mt-1 uppercase">Profile</span>
 </button>
 </nav>
 </>
 );
}
