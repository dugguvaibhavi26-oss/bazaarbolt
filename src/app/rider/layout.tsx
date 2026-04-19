"use client";

import { useAuth } from "@/components/AuthProvider";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

export default function RiderLayout({ children }: { children: React.ReactNode }) {
 const { role, user, signOut, loading: authLoading } = useAuth();
 const pathname = usePathname();
 const router = useRouter();

 useEffect(() => {
 if (!authLoading) {
 if (!user || role !== 'rider') {
 toast.error("Rider access only");
 router.push("/login");
 }
 }
 }, [user, role, authLoading, router]);

 if (authLoading) {
 return (
 <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
 <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
 </div>
 );
 }

 if (!user || role !== 'rider') {
 return null;
 }

 return (
 <div className="min-h-screen bg-zinc-50 flex flex-col">
 {/* Rider Header */}
 <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-2xl shadow-sm border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
 <span className="material-symbols-outlined text-primary font-black">delivery_dining</span>
 </div>
 <h1 className="text-xl font-headline font-black text-zinc-900 tracking-tight">Rider Portal</h1>
 </div>
 <button onClick={() => {
 signOut();
 router.push("/login");
 }}
 className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
 >
 <span className="material-symbols-outlined text-xl">logout</span>
 </button>
 </header>

 <main className="flex-1 pt-24 pb-32">
 <div className="max-w-3xl mx-auto px-4">
 {children}
 </div>
 </main>

 {/* Simple Bottom Bar for Rider - Hidden on detail pages */}
 {!pathname.includes('/orders/') && (
 <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] z-50 bg-zinc-900/95 backdrop-blur-3xl shadow-2xl rounded-full px-6 py-3 flex justify-around items-center">
 <Link href="/rider"className={`flex flex-col items-center gap-1 ${pathname === '/rider'? 'text-primary': 'text-white/40'}`}>
 <span className="material-symbols-outlined text-2xl font-bold">dashboard</span>
 <span className="text-[8px] font-black tracking-widest">Jobs</span>
 </Link>
 <Link href="/rider/earnings"className={`flex flex-col items-center gap-1 ${pathname === '/rider/earnings'? 'text-primary': 'text-white/40'}`}>
 <span className="material-symbols-outlined text-2xl">payments</span>
 <span className="text-[8px] font-black tracking-widest">Earnings</span>
 </Link>
 <Link href="/rider/account"className={`flex flex-col items-center gap-1 ${pathname === '/rider/account'? 'text-primary': 'text-white/40'}`}>
 <span className="material-symbols-outlined text-2xl font-bold">account_circle</span>
 <span className="text-[8px] font-black tracking-widest">Account</span>
 </Link>
 </nav>
 )}
 </div>
 );
}
