"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

export default function AdminRiders() {
 const [riders, setRiders] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 // Find all users with role 'rider'
 const q = query(collection(db, "users"), where("role", "==", "rider"));
 const unsub = onSnapshot(q, (snap) => {
 const rdrs: any[] = [];
 snap.forEach(doc => rdrs.push({ id: doc.id, ...doc.data() }));
 setRiders(rdrs);
 setLoading(false);
 });
 return () => unsub();
 }, []);

 if (loading) return <div className="animate-pulse h-64 bg-white rounded-[40px]"/>;

 return (
 <div className="space-y-8">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Personnel Network</h3>
 <p className="text-xs font-bold text-zinc-400 tracking-widest mt-1">Manage delivery riders and fleet status</p>
 </div>
 <button onClick={() => toast.success("Accessing recruitment portal...")} className="bg-zinc-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] tracking-widest flex items-center gap-2 hover:bg-black shadow-lg">
 <span className="material-symbols-outlined text-sm">person_add</span>
 Onboard Rider
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
 {riders.map((r) => (
 <div key={r.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-zinc-100 group hover:shadow-xl transition-all">
 <div className="flex items-center gap-5 mb-6">
 <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-zinc-100 shadow-inner">
 <span className="material-symbols-outlined text-3xl font-black">delivery_dining</span>
 </div>
 <div className="flex-1">
 <h4 className="font-headline font-black text-zinc-900 leading-tight tracking-tighter">{r.name || "Active Rider"}</h4>
 <p className="text-[10px] font-bold text-zinc-400 tracking-widest mt-1">{r.email}</p>
 </div>
 <div className={`w-3 h-3 rounded-full ${r.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]': 'bg-red-500 animate-pulse'}`}></div>
 </div>

 <div className="grid grid-cols-2 gap-3 mb-6">
 <div className="bg-zinc-50 p-3 rounded-xl">
 <p className="text-[8px] font-black text-zinc-400 tracking-widest mb-1">Lifetime Trips</p>
 <p className="text-sm font-black text-zinc-900">{r.totalTrips || 0}</p>
 </div>
 <div className="bg-zinc-50 p-3 rounded-xl">
 <p className="text-[8px] font-black text-zinc-400 tracking-widest mb-1">Avg Rating</p>
 <p className="text-sm font-black text-zinc-900">★ {r.rating || "4.9"}</p>
 </div>
 </div>

 <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
 <span className="text-[9px] font-black text-zinc-400 tracking-widest">UID: {r.id.slice(0,8)}</span>
 <button onClick={() => toast.success("Accessing logs...")} className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-[9px] font-black tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">View Performance</button>
 </div>
 </div>
 ))}

 {riders.length === 0 && (
 <div className="col-span-full py-20 bg-zinc-100 rounded-[40px] border border-dashed border-zinc-300 flex flex-col items-center">
 <span className="material-symbols-outlined text-5xl text-zinc-300 mb-4">no_accounts</span>
 <p className="text-zinc-500 font-black tracking-widest text-[10px]">No Riders Registered</p>
 </div>
 )}
 </div>
 </div>
 );
}
