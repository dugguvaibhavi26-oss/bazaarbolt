"use client";

import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";

interface Order {
 id: string;
 status: string;
 total: number;
 createdAt: string;
 items: any[];
}

export default function MyOrders() {
 const { user } = useAuth();
 const { cart } = useStore();
 const router = useRouter();
 const [orders, setOrders] = useState<Order[]>([]);
 const [loading, setLoading] = useState(true);

 const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

 useEffect(() => {
 if (!user) {
 setLoading(false);
 return;
 }

 const q = query(
 collection(db, "orders"),
 where("userId", "==", user.uid)
 );

 const unsubscribe = onSnapshot(q, (snapshot) => {
 const ords: Order[] = [];
 snapshot.forEach(doc => {
 ords.push({ id: doc.id, ...doc.data() } as Order);
 });
 // Sort client-side to bypass Firebase Index requirement
 ords.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
 setOrders(ords);
 setLoading(false);
 });

 return () => unsubscribe();
 }, [user]);

 const getStatusDisplay = (status: string) => {
 const s = status.toUpperCase();
 if (s === "DELIVERED") return { text: "Delivered", icon: "task_alt", color: "text-green-600 bg-green-50 border-green-200"};
 if (s === "OUT_FOR_DELIVERY") return { text: "On the way", icon: "local_shipping", color: "text-primary bg-primary/10 border-primary/20"};
 if (s === "CANCELLED") return { text: "Cancelled", icon: "cancel", color: "text-red-600 bg-red-50 border-red-200"};
 return { text: "Processing", icon: "pending_actions", color: "text-blue-600 bg-blue-50 border-blue-200"};
 };

 return (
 <main className="min-h-screen bg-white pb-24">
 <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl border-b border-zinc-100">
 <div className="flex items-center justify-between px-4 py-3 w-full max-w-3xl mx-auto">
 <div className="flex items-center gap-3">
 <button onClick={() => router.push("/")} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
 <span className="material-symbols-outlined text-zinc-900">arrow_back</span>
 </button>
 <h1 className="text-xl font-headline font-black text-zinc-900 tracking-tight">My Orders</h1>
 </div>
 <Link href="/cart"className="relative p-2">
 <span className="material-symbols-outlined text-zinc-900">shopping_bag</span>
 {cartCount > 0 && (
 <span className="absolute top-1 right-1 bg-red-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center pointer-events-none">
 {cartCount}
 </span>
 )}
 </Link>
 </div>
 </header>
 <div className="max-w-3xl mx-auto px-4 mt-20">
 {!user ? (
 <div className="text-center py-20 bg-zinc-50 rounded-3xl border border-zinc-100">
 <h2 className="text-zinc-600 font-headline font-bold text-lg mb-4">Sign in to view orders</h2>
 <Link href="/login"className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-black text-xs">Sign In</Link>
 </div>
 ) : loading ? (
 <div className="space-y-4">
 {[1,2,3].map(n => <div key={n} className="h-28 bg-zinc-50 rounded-2xl animate-pulse"/>)}
 </div>
 ) : orders.length === 0 ? (
 <div className="text-center py-24 flex flex-col items-center opacity-30">
 <span className="material-symbols-outlined text-6xl mb-4">inventory_2</span>
 <h2 className="font-headline font-black text-xs tracking-widest">No orders yet</h2>
 </div>
 ) : (
 <div className="space-y-4">
 {orders.map(order => {
 const statusDisplay = getStatusDisplay(order.status);
 return (
 <Link href={`/orders/${order.id}`} key={order.id} className="block bg-white p-4 rounded-2xl border border-zinc-100 hover:shadow-md transition-all">
 <div className="flex justify-between items-start mb-4">
 <div>
 <p className="text-[8px] font-black text-zinc-400 mb-1 tracking-widest">#{order.id.slice(-6).toUpperCase()}</p>
 <p className="font-headline font-black text-xs text-zinc-900">{new Date(order.createdAt).toLocaleString()}</p>
 </div>
 <div className={`px-2 py-1 rounded-md text-[8px] font-black tracking-wider flex items-center gap-1 border ${statusDisplay.color}`}>
 {statusDisplay.text}
 </div>
 </div>
 <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-50">
 <span className="text-[10px] font-black text-zinc-400 tracking-widest">{order.items.length} Items</span>
 <span className="font-headline font-black text-sm text-zinc-900">₹{order.total.toFixed(0)}</span>
 </div>
 </Link>
 );
 })}
 </div>
 )}
 </div>

 <nav className="fixed bottom-2 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] z-50 bg-white/95 backdrop-blur-xl shadow-2xl border border-zinc-200 rounded-full px-6 py-2 flex justify-between items-center">
 <Link href="/"className="flex flex-col items-center text-zinc-400">
 <span className="material-symbols-outlined text-[20px]">home</span>
 <span className="text-[8px] font-black tracking-widest mt-0.5">Home</span>
 </Link>
 <Link href="/orders"className="flex flex-col items-center text-zinc-900">
 <span className="material-symbols-outlined text-[20px]"style={{fontVariationSettings: "'FILL'1"}}>inventory_2</span>
 <span className="text-[8px] font-black tracking-widest mt-0.5">Orders</span>
 </Link>
 <Link href="/cart"className="flex flex-col items-center text-zinc-400 relative">
 <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
 {cartCount > 0 && <div className="absolute -top-1.5 -right-2 bg-primary text-zinc-900 text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white shadow-sm">{cartCount}</div>}
 <span className="text-[8px] font-black tracking-widest mt-0.5">Cart</span>
 </Link>
 </nav>
 </main>
 );
}
