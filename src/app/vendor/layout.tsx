"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && (!user || role !== 'vendor')) {
      router.replace("/login?redirect=" + pathname);
    }
  }, [user, role, authLoading, pathname, router]);

  useEffect(() => {
    if (role !== 'vendor' || !user) return;

    const q = query(
      collection(db, "orders"),
      where("vendorId", "==", user.uid),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
          audio.play().catch(e => console.log("Audio play failed"));
          toast.success("NEW ORDER RECEIVED! ⚡️", {
            duration: 5000,
            icon: '🛒',
            style: {
              borderRadius: '20px',
              background: '#22c55e',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '12px'
            }
          });
        }
      });
    });

    return () => unsubscribe();
  }, [user, role]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  if (role !== 'vendor') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-primary font-bold">storefront</span>
          </div>
          <div>
            <h1 className="text-sm font-black text-zinc-900 tracking-tight leading-none">Vendor Panel</h1>
            <p className="text-[10px] font-bold text-zinc-400 tracking-widest mt-1">BAZAARBOLT PARTNER</p>
          </div>
        </div>
        <button onClick={() => signOut()} className="p-2 bg-zinc-50 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all">
          <span className="material-symbols-outlined text-xl">logout</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-zinc-100 px-6 py-3 flex items-center justify-around z-50">
        <Link href="/vendor" className={`flex flex-col items-center gap-1 ${pathname === '/vendor' ? 'text-primary' : 'text-zinc-400'}`}>
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: pathname === '/vendor' ? "'FILL' 1" : "" }}>dashboard</span>
          <span className="text-[9px] font-black tracking-widest">DASHBOARD</span>
        </Link>
        <Link href="/vendor/orders" className={`flex flex-col items-center gap-1 ${pathname === '/vendor/orders' ? 'text-primary' : 'text-zinc-400'}`}>
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: pathname === '/vendor/orders' ? "'FILL' 1" : "" }}>inventory_2</span>
          <span className="text-[9px] font-black tracking-widest">ORDERS</span>
        </Link>
        <Link href="/vendor/products" className={`flex flex-col items-center gap-1 ${pathname === '/vendor/products' ? 'text-primary' : 'text-zinc-400'}`}>
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: pathname === '/vendor/products' ? "'FILL' 1" : "" }}>grid_view</span>
          <span className="text-[9px] font-black tracking-widest">PRODUCTS</span>
        </Link>
        <Link href="/vendor/earnings" className={`flex flex-col items-center gap-1 ${pathname === '/vendor/earnings' ? 'text-primary' : 'text-zinc-400'}`}>
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: pathname === '/vendor/earnings' ? "'FILL' 1" : "" }}>payments</span>
          <span className="text-[9px] font-black tracking-widest">EARNINGS</span>
        </Link>
      </nav>
    </div>
  );
}
