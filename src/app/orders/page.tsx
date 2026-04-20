"use client";

import { useAuth } from "@/components/AuthProvider";
import { useStore } from "@/store/useStore";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const { cart } = useStore();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    // Query without orderBy to avoid index requirement
    const q = query(
      collection(db, "orders"),
      where("userId", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      // Sort on client side to keep things running without index
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(items);
      setLoading(false);
    });
    return () => unsub();
  }, [user, authLoading]);

  const getStatusDisplay = (status: string) => {
    switch(status.toUpperCase()) {
      case 'PLACED': return { text: 'Ordered', color: 'bg-zinc-100 text-zinc-500 border-zinc-200' };
      case 'ACCEPTED': return { text: 'Preparing', color: 'bg-blue-50 text-blue-600 border-blue-100' };
      case 'PICKED': return { text: 'Picked up', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
      case 'ON_THE_WAY': return { text: 'On the way', color: 'bg-orange-50 text-orange-600 border-orange-100' };
      case 'DELIVERED': return { text: 'Delivered', color: 'bg-green-50 text-green-600 border-green-100' };
      case 'CANCELLED': return { text: 'Cancelled', color: 'bg-red-50 text-red-600 border-red-100' };
      default: return { text: status, color: 'bg-zinc-100 text-zinc-500 border-zinc-200' };
    }
  };

  return (
    <main className="bg-zinc-50 min-h-screen pb-44">
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-2xl border-b border-zinc-100 pt-safe">
        <div className="flex items-center px-6 py-5 gap-4">
          <button onClick={() => router.push("/")} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <span className="material-symbols-outlined text-zinc-900 font-bold">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-headline font-black text-zinc-900 tracking-tighter leading-none">History</h1>
            <span className="text-[10px] font-black text-zinc-400 tracking-widest mt-1">Your past orders</span>
          </div>
        </div>
      </header>

      <div className="pt-24 px-4 max-w-3xl mx-auto space-y-4">
        {authLoading || (loading && user) ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-3xl animate-pulse" />)}
          </div>
        ) : !user ? (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-zinc-300 text-4xl">account_circle</span>
            </div>
            <h2 className="text-2xl font-headline font-black text-zinc-900 tracking-tighter leading-none mb-2">Sign in required</h2>
            <p className="text-[10px] font-black text-zinc-400 tracking-widest mb-8">Please login to view your order history</p>
            <button onClick={() => router.push("/login?redirect=orders")} className="bg-primary text-zinc-900 px-10 py-4 rounded-2xl font-black text-[10px] tracking-widest shadow-xl">Login now</button>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-zinc-300 text-4xl">receipt_long</span>
            </div>
            <h2 className="text-2xl font-headline font-black text-zinc-900 tracking-tighter leading-none mb-2">No orders yet</h2>
            <p className="text-[10px] font-black text-zinc-400 tracking-widest mb-8">Ready to make your first order?</p>
            <button onClick={() => router.push("/")} className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest shadow-xl">Shop now</button>
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
                      <p className="font-headline font-black text-xs text-zinc-900">
                        {order.createdAt ? (typeof order.createdAt === 'string' ? new Date(order.createdAt).toLocaleString() : 'Date error') : 'Pending'}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-md text-[8px] font-black tracking-wider flex items-center gap-1 border ${statusDisplay.color}`}>
                      {statusDisplay.text}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-50">
                    <span className="text-[10px] font-black text-zinc-400 tracking-widest">{order.items.length} items</span>
                    <span className="font-headline font-black text-sm text-zinc-900">₹{order.total.toFixed(0)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
