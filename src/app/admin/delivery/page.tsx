"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function AdminDelivery() {
 const [slots, setSlots] = useState<string[]>([]);
 const [newSlot, setNewSlot] = useState("");
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const unsub = onSnapshot(doc(db, "settings", "delivery"), (snap) => {
 if (snap.exists()) {
 setSlots(snap.data().slots || []);
 }
 setLoading(false);
 });
 return () => unsub();
 }, []);

 const saveSlots = async (updatedSlots: string[]) => {
 try {
 await setDoc(doc(db, "settings", "delivery"), { slots: updatedSlots }, { merge: true });
 toast.success("Delivery Slots Updated");
 } catch (error) {
 toast.error("Failed to update slots");
 }
 };

 const addSlot = () => {
 if (!newSlot.trim()) return;
 if (slots.includes(newSlot.trim())) {
 toast.error("Slot already exists");
 return;
 }
 const updated = [...slots, newSlot.trim()];
 setSlots(updated);
 saveSlots(updated);
 setNewSlot("");
 };

 const removeSlot = (index: number) => {
 const updated = slots.filter((_, i) => i !== index);
 setSlots(updated);
 saveSlots(updated);
 };

 if (loading) return (
 <div className="flex items-center justify-center p-20">
 <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
 </div>
 );

 return (
  <div className="max-w-4xl space-y-6 lg:space-y-12 animate-in fade-in duration-500">
   <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 lg:gap-6">
    <div>
     <h2 className="text-2xl lg:text-4xl font-headline font-black text-zinc-900 tracking-tighter">Delivery Network</h2>
     <p className="text-[10px] lg:text-xs font-bold text-zinc-400 tracking-widest mt-1 uppercase">Scheduling & Capacity Controls</p>
    </div>
    <div className="bg-primary/5 border border-primary/20 rounded-2xl px-4 lg:px-6 py-2 lg:py-3 flex items-center justify-center gap-3 w-full lg:w-auto">
     <span className="material-symbols-outlined text-primary text-xl">schedule_send</span>
     <span className="text-[10px] font-black text-zinc-900 tracking-widest uppercase">{slots.length} Active Slots</span>
    </div>
   </header>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
    {/* Slot Input Area */}
    <section className="lg:col-span-1 space-y-6">
     <div className="bg-white rounded-[28px] lg:rounded-[32px] p-6 lg:p-8 shadow-sm border border-zinc-100 space-y-6">
      <h3 className="text-[10px] lg:text-xs font-black text-zinc-900 tracking-widest uppercase">New Schedule Node</h3>
      <div className="space-y-4">
       <div className="space-y-2">
        <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 tracking-widest ml-1 uppercase">Slot Range</label>
        <input type="text" placeholder="e.g. 08:00 AM - 10:00 AM"
         className="w-full bg-zinc-50 border-none rounded-xl lg:rounded-2xl p-4 lg:p-5 font-black text-xs focus:ring-4 ring-primary/20 transition-all"
         value={newSlot}
         onChange={e => setNewSlot(e.target.value)}
         onKeyDown={e => e.key === 'Enter' && addSlot()}
        />
       </div>
       <button onClick={addSlot}
        className="w-full bg-zinc-900 text-white h-14 lg:h-16 rounded-xl lg:rounded-2xl font-black tracking-widest text-[9px] lg:text-[10px] hover:bg-black transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 uppercase"
       >
        <span className="material-symbols-outlined text-sm">add</span>
        Publish Slot
       </button>
      </div>
     </div>
     <div className="bg-zinc-900 rounded-[28px] lg:rounded-[32px] p-6 lg:p-8 text-white">
      <span className="material-symbols-outlined text-primary text-2xl lg:text-3xl mb-4">info</span>
      <p className="text-[10px] lg:text-xs font-bold leading-relaxed opacity-80 uppercase tracking-tight">Active slots appear instantly at checkout. Manage capacity node by node.</p>
     </div>
    </section>

    {/* Slots List */}
    <section className="lg:col-span-2 space-y-6">
     <div className="bg-white rounded-[32px] lg:rounded-[40px] p-6 lg:p-10 shadow-sm border border-zinc-100 min-h-[300px] lg:min-h-[400px]">
      <div className="flex items-center justify-between mb-6 lg:mb-10 border-b border-zinc-50 pb-4 lg:pb-6">
       <h3 className="text-lg lg:text-xl font-headline font-black text-zinc-900">Active Schedule</h3>
       <span className="text-[8px] lg:text-[10px] font-black text-zinc-400 tracking-widest uppercase">Chronological</span>
      </div>

      {slots.length === 0 ? (
       <div className="flex flex-col items-center justify-center py-20 text-zinc-300">
        <span className="material-symbols-outlined text-5xl lg:text-6xl mb-4">event_busy</span>
        <p className="text-[10px] font-black tracking-widest uppercase">No slots configured</p>
       </div>
      ) : (
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
        {slots.map((slot, i) => (
         <div key={i} className="group flex items-center justify-between bg-zinc-50 rounded-[20px] lg:rounded-3xl p-4 lg:p-6 border border-zinc-100 hover:border-primary/50 hover:bg-white transition-all hover:shadow-xl">
          <div className="flex items-center gap-3 lg:gap-4">
           <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white rounded-lg lg:rounded-xl shadow-sm border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-lg lg:text-xl">timer</span>
           </div>
           <p className="text-xs lg:text-sm font-black text-zinc-900 tracking-tight">{slot}</p>
          </div>
          <button onClick={() => removeSlot(i)}
           className="w-8 h-8 lg:w-10 lg:h-10 bg-white rounded-lg lg:rounded-xl flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
          >
           <span className="material-symbols-outlined text-base lg:text-xl">delete</span>
          </button>
         </div>
        ))}
       </div>
      )}
     </div>
    </section>
 </div>
 </div>
 );
}
