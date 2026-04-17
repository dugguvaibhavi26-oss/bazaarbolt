"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { mapSettings } from "@/lib/mappers";
import { AppSettings } from "@/types";

export default function AdminSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    storeOpen: true,
    bannerImage: "",
    announcement: "",
    primaryColor: "#22c55e",
    taxPercent: 5,
    handlingCharge: 5,
    deliveryFee: 30,
    freeDeliveryThreshold: 500,
    smallCartFee: 15,
    smallCartThreshold: 100,
    customCharges: [],
    codEnabled: true,
    coupon: { code: "", discount: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "config"), (docSnap) => {
      try {
        if (docSnap.exists()) {
          setSettings(mapSettings(docSnap));
        }
      } catch (e) {
        console.error("Settings mapping error:", e);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading("Saving configuration...");
    try {
      await setDoc(doc(db, "settings", "config"), settings, { merge: true });
      toast.success("Settings applied globally", { id: toastId });
    } catch (err) {
      toast.error("Failed to propagate settings", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
     <div className="max-w-3xl space-y-6 animate-pulse">
        <div className="h-12 bg-white rounded-2xl w-1/3" />
        <div className="h-96 bg-white rounded-[40px]" />
     </div>
  );

  return (
    <div className="max-w-4xl space-y-8 pb-32">
       <div className="flex items-center justify-between">
          <div>
             <h3 className="text-2xl font-black text-zinc-900 tracking-tight">System Configuration</h3>
             <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Control global store parameters</p>
          </div>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-black shadow-xl active:scale-95 disabled:opacity-50 transition-all"
          >
             <span className="material-symbols-outlined text-sm">{saving ? 'sync' : 'save_as'}</span>
             {saving ? 'Syncing...' : 'Propagate Changes'}
          </button>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
             {/* Main settings card */}
             <div className="bg-white rounded-[40px] p-10 shadow-sm border border-zinc-100 space-y-10">
                <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                   <div>
                      <p className="font-headline font-black text-zinc-900 uppercase tracking-tighter">Live Store Status</p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Enables/Disables all customer checkouts</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={settings.storeOpen} onChange={e => setSettings({...settings, storeOpen: e.target.checked})} />
                      <div className="w-14 h-7 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                   </label>
                </div>

                <div className="space-y-6">
                   <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1 mb-2 block">Announcement Bar Content</label>
                      <input 
                        type="text" 
                        value={settings.announcement}
                        onChange={e => setSettings({...settings, announcement: e.target.value})}
                        className="w-full bg-zinc-50 border-none rounded-2xl p-5 font-bold text-sm focus:ring-2 ring-primary transition-all"
                        placeholder="e.g. ⚡️ FLASH SALE: 50% OFF ON ALL DAIRY ⚡️"
                      />
                   </div>

                   <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1 mb-2 block">Global Tax Rate (%)</label>
                      <input 
                        type="number" 
                        value={settings.taxPercent}
                        onChange={e => setSettings({...settings, taxPercent: parseFloat(e.target.value)})}
                        className="w-full bg-zinc-50 border-none rounded-2xl p-5 font-bold text-sm focus:ring-2 ring-primary transition-all"
                      />
                   </div>

                   <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1 mb-2 block">Hero Banner Decoration URL</label>
                      <input 
                        type="text" 
                        value={settings.bannerImage}
                        onChange={e => setSettings({...settings, bannerImage: e.target.value})}
                        className="w-full bg-zinc-50 border-none rounded-2xl p-5 font-bold text-sm focus:ring-2 ring-primary transition-all"
                        placeholder="https://images.unsplash.com/..."
                      />
                      {settings.bannerImage && (
                         <div className="mt-4 rounded-3xl overflow-hidden border border-zinc-100 shadow-sm h-32 relative">
                            <img src={settings.bannerImage} className="w-full h-full object-cover" alt="" />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                               <span className="text-white font-black text-[10px] uppercase tracking-widest">Banner Active</span>
                            </div>
                         </div>
                      )}
                   </div>
                </div>
             </div>
          </div>

          <aside className="lg:col-span-4 space-y-8">
             <div className="bg-zinc-900 rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <span className="material-symbols-outlined text-8xl">palette</span>
                </div>
                <h4 className="font-headline font-black text-lg mb-6 tracking-tight relative z-10">Brand Identity</h4>
                <div className="space-y-6 relative z-10">
                   <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Primary Identity Color</label>
                      <div className="flex items-center gap-3">
                         <input 
                           type="color" 
                           value={settings.primaryColor}
                           onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                           className="w-12 h-12 bg-transparent border-none rounded cursor-pointer" 
                         />
                         <input 
                           type="text" 
                           value={settings.primaryColor}
                           onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                           className="bg-white/10 border-none rounded-xl p-3 font-bold text-xs flex-1 text-white" 
                         />
                      </div>
                   </div>
                   <div className="pt-4 border-t border-white/10">
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">Changes to identity color will affect buttons, status indicators, and highlights across the customer app.</p>
                   </div>
                </div>
             </div>

             <div className="bg-white rounded-[40px] p-8 border border-zinc-100 shadow-sm">
                <h4 className="font-headline font-black text-sm uppercase tracking-widest text-zinc-400 mb-4">Payment Control</h4>
                <div className="flex items-center justify-between">
                   <span className="font-bold text-zinc-700 text-sm">Allow COD Orders</span>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={settings.codEnabled} onChange={e => setSettings({...settings, codEnabled: e.target.checked})} />
                      <div className="w-12 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                   </label>
                </div>
             </div>
          </aside>
       </div>
    </div>
  );
}
