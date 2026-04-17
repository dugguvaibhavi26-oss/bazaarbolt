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
    <div className="max-w-4xl space-y-12 animate-in fade-in duration-500">
       <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl font-headline font-black text-zinc-900 tracking-tighter uppercase">Delivery Configuration</h2>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Manage scheduling and capacity controls</p>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-2xl px-6 py-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">schedule_send</span>
            <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">{slots.length} Active Slots</span>
          </div>
       </header>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Slot Input Area */}
          <section className="lg:col-span-1 space-y-6">
             <div className="bg-white rounded-[32px] p-8 shadow-sm border border-zinc-100 space-y-6">
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Add New Slot</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Slot Label</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 08:00 AM - 10:00 AM"
                      className="w-full bg-zinc-50 border-none rounded-2xl p-5 font-black text-xs focus:ring-4 ring-primary/20 transition-all"
                      value={newSlot}
                      onChange={e => setNewSlot(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addSlot()}
                    />
                  </div>
                  <button 
                    onClick={addSlot}
                    className="w-full bg-zinc-900 text-white h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-xl shadow-zinc-900/10 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Publish Slot
                  </button>
                </div>
             </div>
             
             <div className="bg-zinc-900 rounded-[32px] p-8 text-white">
                <span className="material-symbols-outlined text-primary text-3xl mb-4">info</span>
                <p className="text-xs font-bold leading-relaxed opacity-80">These slots will be visible to customers at checkout. Make sure to remove slots that are no longer serviced.</p>
             </div>
          </section>

          {/* Slots List */}
          <section className="lg:col-span-2 space-y-6">
             <div className="bg-white rounded-[40px] p-10 shadow-sm border border-zinc-100 min-h-[400px]">
                <div className="flex items-center justify-between mb-10 border-b border-zinc-50 pb-6">
                   <h3 className="text-xl font-headline font-black text-zinc-900 uppercase">Active Schedule</h3>
                   <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Sequence: Creation Order</span>
                </div>

                {slots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-zinc-300">
                    <span className="material-symbols-outlined text-6xl mb-4">event_busy</span>
                    <p className="text-[10px] font-black uppercase tracking-widest">No slots configured</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {slots.map((slot, i) => (
                      <div key={i} className="group flex items-center justify-between bg-zinc-50 rounded-3xl p-6 border border-zinc-100 hover:border-primary/50 hover:bg-white transition-all hover:shadow-xl">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-xl">timer</span>
                          </div>
                          <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">{slot}</p>
                        </div>
                        <button 
                          onClick={() => removeSlot(i)}
                          className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <span className="material-symbols-outlined">delete</span>
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
