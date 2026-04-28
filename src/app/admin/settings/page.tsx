"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { mapSettings } from "@/lib/mappers";
import { AppSettings, PromoSection } from "@/types";
import { useStore } from "@/store/useStore";

export default function AdminSettings() {
  const { categories, products } = useStore();
  const [settings, setSettings] = useState<AppSettings>({
    storeOpen: true,
    bannerImage: "",
    heroBanners: [],
    announcement: "",
    primaryColor: "#22c55e",
    taxPercent: 5,
    handlingCharge: 5,
    deliveryFee: 30,
    freeDeliveryThreshold: 499,
    smallCartFee: 15,
    smallCartThreshold: 99,
    customCharges: [],
    codEnabled: true,
    coupon: { code: "", discount: 0 },
    notificationTemplates: {
      PLACED: { title: "Order confirmed ✅", body: "Hi {{name}}, your order has been placed successfully!" },
      ACCEPTED: { title: "Order Accepted ✅", body: "Hi {{name}}, your order has been accepted by the store." },
      PICKED: { title: "Order Shipped 🚚", body: "Hi {{name}}, your order has been picked up and is on its way." },
      DELIVERED: { title: "Order Delivered 🏁", body: "Hi {{name}}, your order has been delivered. Enjoy!" },
      CANCELLED: { title: "Order Cancelled 🚫", body: "Hi {{name}}, your order has been cancelled. Any payment will be refunded." },
    }
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
      <div className="h-12 bg-white rounded-2xl w-1/3"/>
      <div className="h-96 bg-white rounded-[40px]"/>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-6 lg:space-y-8 pb-32">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl lg:text-2xl font-black text-zinc-900 tracking-tight">System Configuration</h3>
          <p className="text-[10px] lg:text-xs font-bold text-zinc-400 tracking-widest mt-1 uppercase">Control global store parameters</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="w-full lg:w-auto bg-zinc-900 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-2xl font-black text-[9px] lg:text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-black shadow-xl active:scale-95 disabled:opacity-50 transition-all uppercase"
        >
          <span className="material-symbols-outlined text-sm">{saving ? 'sync' : 'save_as'}</span>
          {saving ? 'Syncing...' : 'Propagate Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-8 space-y-6 lg:space-y-8">
          <div className="bg-white rounded-[32px] lg:rounded-[40px] p-6 lg:p-10 shadow-sm border border-zinc-100 space-y-8 lg:space-y-10">
            <div className="flex items-center justify-between p-4 lg:p-6 bg-zinc-50 rounded-2xl lg:rounded-3xl border border-zinc-100">
              <div className="pr-4">
                <p className="font-headline font-black text-zinc-900 tracking-tighter text-sm lg:text-base leading-tight">Live Store Status</p>
                <p className="text-[9px] lg:text-[10px] font-bold text-zinc-500 tracking-widest uppercase mt-0.5">Global Checkout Switch</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" className="sr-only peer" checked={settings.storeOpen} onChange={e => setSettings({...settings, storeOpen: e.target.checked})} />
                <div className="w-12 h-6 lg:w-14 lg:h-7 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 lg:after:h-6 lg:after:w-6 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-1.5 lg:mb-2 block uppercase">Announcement Bar</label>
                <input type="text" value={settings.announcement}
                  onChange={e => setSettings({...settings, announcement: e.target.value})}
                  className="w-full bg-zinc-50 border-none rounded-xl lg:rounded-2xl p-4 lg:p-5 font-bold text-xs lg:text-sm focus:ring-2 ring-primary transition-all shadow-inner"
                  placeholder="e.g. ⚡️ FLASH SALE: 50% OFF ⚡️"
                />
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
                <label className="text-[9px] font-black tracking-widest text-zinc-500 mb-2 block uppercase">Primary UI Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={settings.primaryColor}
                    onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                    className="w-12 h-12 bg-transparent border-none rounded cursor-pointer"/>
                  <input type="text" value={settings.primaryColor}
                    onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                    className="bg-white/10 border-none rounded-xl p-3 font-bold text-xs flex-1 text-white"/>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] lg:rounded-[40px] p-6 lg:p-8 border border-zinc-100 shadow-sm space-y-6">
            <h4 className="font-headline font-black text-xs lg:text-sm tracking-widest text-zinc-400 uppercase">Payment & Fees</h4>
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-700 text-xs lg:text-sm">Allow COD</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.codEnabled} onChange={e => setSettings({...settings, codEnabled: e.target.checked})} />
                <div className="w-10 h-5 lg:w-12 lg:h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 lg:after:h-5 lg:after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
             <div className="pt-4 border-t border-zinc-50 space-y-4">
               <div>
                  <label className="text-[9px] font-black tracking-widest text-zinc-400 mb-1.5 lg:mb-2 block uppercase">Delivery Fee (₹)</label>
                  <input type="number" value={settings.deliveryFee} onChange={e => setSettings({...settings, deliveryFee: parseFloat(e.target.value)})} className="w-full bg-zinc-50 p-3 rounded-xl font-bold text-xs"/>
               </div>
               <div>
                  <label className="text-[9px] font-black tracking-widest text-zinc-400 mb-1.5 lg:mb-2 block uppercase">Small Cart Fee (₹)</label>
                  <input type="number" value={settings.smallCartFee} onChange={e => setSettings({...settings, smallCartFee: parseFloat(e.target.value)})} className="w-full bg-zinc-50 p-3 rounded-xl font-bold text-xs"/>
               </div>
             </div>
          </div>

          <div className="bg-white rounded-[40px] p-8 border border-zinc-100 shadow-sm space-y-6">
            <h4 className="font-headline font-black text-sm tracking-widest text-zinc-400 uppercase">Notification Templates</h4>
            <p className="text-[8px] font-bold text-zinc-400 uppercase leading-relaxed">Use <code className="text-primary font-black">{"{{name}}"}</code> to inject customer name</p>
            <div className="space-y-6">
              {Object.keys(settings.notificationTemplates || {}).map((status) => (
                <div key={status} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-3">
                  <span className="text-[9px] font-black text-primary tracking-widest uppercase">{status}</span>
                  <input 
                    type="text" 
                    placeholder="Notification Title"
                    value={settings.notificationTemplates?.[status]?.title || ""}
                    onChange={e => setSettings({
                      ...settings, 
                      notificationTemplates: {
                        ...settings.notificationTemplates,
                        [status]: { ...settings.notificationTemplates?.[status], title: e.target.value }
                      }
                    })}
                    className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-xs font-bold"
                  />
                  <textarea 
                    placeholder="Notification Body"
                    rows={2}
                    value={settings.notificationTemplates?.[status]?.body || ""}
                    onChange={e => setSettings({
                      ...settings, 
                      notificationTemplates: {
                        ...settings.notificationTemplates,
                        [status]: { ...settings.notificationTemplates?.[status], body: e.target.value }
                      }
                    })}
                    className="w-full bg-white border border-zinc-200 rounded-xl p-3 text-xs font-bold"
                  />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
