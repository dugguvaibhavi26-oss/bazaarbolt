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
  <div className="space-y-6 lg:space-y-8 pb-32">
   <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
    <div>
     <h3 className="text-xl lg:text-2xl font-black text-zinc-900 tracking-tight">Personnel Network</h3>
     <p className="text-[10px] lg:text-xs font-bold text-zinc-400 tracking-widest mt-1 uppercase">Manage delivery riders and fleet status</p>
    </div>
    <button onClick={() => toast.success("Accessing recruitment portal...")} className="w-full lg:w-auto bg-zinc-900 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-2xl font-black text-[9px] lg:text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-black shadow-lg uppercase">
     <span className="material-symbols-outlined text-sm">person_add</span>
     Onboard Rider
    </button>
   </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
   {riders.map((r) => (
    <div key={r.id} className="bg-white rounded-[28px] lg:rounded-[32px] p-5 lg:p-6 shadow-sm border border-zinc-100 group hover:shadow-xl transition-all">
     <div className="flex items-center gap-4 lg:gap-5 mb-5 lg:mb-6">
      <div className="w-14 h-14 lg:w-16 lg:h-16 bg-zinc-50 rounded-xl lg:rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-zinc-100 shadow-inner">
       <span className="material-symbols-outlined text-2xl lg:text-3xl font-black">delivery_dining</span>
      </div>
      <div className="flex-1">
       <h4 className="font-headline font-black text-zinc-900 leading-tight tracking-tighter text-sm lg:text-base">{r.name || "Active Rider"}</h4>
       <p className="text-[9px] lg:text-[10px] font-bold text-zinc-400 tracking-widest mt-0.5 uppercase truncate max-w-[120px] lg:max-w-none">{r.email}</p>
      </div>
      <div className={`w-2.5 h-2.5 rounded-full ${r.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]': 'bg-red-500 animate-pulse'}`}></div>
     </div>

     <div className="grid grid-cols-2 gap-2 lg:gap-3 mb-5 lg:mb-6">
      <div className="bg-zinc-50 p-2.5 lg:p-3 rounded-xl">
       <p className="text-[7px] lg:text-[8px] font-black text-zinc-400 tracking-widest mb-1 uppercase">Lifetime Trips</p>
       <p className="text-xs lg:text-sm font-black text-zinc-900">{r.totalTrips || 0}</p>
      </div>
      <div className="bg-zinc-50 p-2.5 lg:p-3 rounded-xl">
       <p className="text-[7px] lg:text-[8px] font-black text-zinc-400 tracking-widest mb-1 uppercase">Avg Rating</p>
       <p className="text-xs lg:text-sm font-black text-zinc-900">★ {r.rating || "4.9"}</p>
      </div>
     </div>

     <div className="flex items-center justify-between pt-5 lg:pt-6 border-t border-zinc-100">
      <span className="text-[8px] lg:text-[9px] font-black text-zinc-400 tracking-widest uppercase">ID: {r.id.slice(0,8)}</span>
      <button onClick={() => toast.success("Accessing logs...")} className="px-3 lg:px-4 py-1.5 lg:py-2 bg-zinc-900 text-white rounded-lg lg:rounded-xl text-[8px] lg:text-[9px] font-black tracking-widest opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity uppercase">Performance</button>
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
