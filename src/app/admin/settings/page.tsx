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
    },
    sectionSettings: { BB: {}, CAFE: {} }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifContext, setNotifContext] = useState<"GLOBAL" | "BB" | "CAFE">("GLOBAL");

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

  const SettingField = ({ label, field, type = "text", placeholder = "" }: { label: string, field: keyof AppSettings, type?: string, placeholder?: string }) => {
    const [context, setContext] = useState<"GLOBAL" | "BB" | "CAFE">("GLOBAL");
    
    const value = context === "GLOBAL" 
      ? (settings[field] as any)
      : (settings.sectionSettings?.[context]?.[field as any] ?? "");
      
    const handleChange = (e: any) => {
      const newVal = type === "number" ? parseFloat(e.target.value) : (type === "checkbox" ? e.target.checked : e.target.value);
      if (context === "GLOBAL") {
        setSettings({ ...settings, [field]: newVal });
      } else {
        setSettings({
          ...settings,
          sectionSettings: {
            ...settings.sectionSettings,
            [context]: {
              ...(settings.sectionSettings?.[context] || {}),
              [field]: newVal
            }
          }
        });
      }
    };

    const isOverridden = context !== "GLOBAL" && settings.sectionSettings?.[context]?.[field as any] !== undefined;

    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center mb-1">
          <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 uppercase">{label}</label>
          <div className="flex items-center gap-2">
            {isOverridden && <span className="text-[8px] font-bold text-primary uppercase">Overridden</span>}
            <select 
              value={context} 
              onChange={e => setContext(e.target.value as any)}
              className="text-[9px] font-black bg-zinc-100 border-none rounded-lg px-2 py-1 uppercase focus:ring-1 ring-primary transition-all"
            >
              <option value="GLOBAL">Global</option>
              <option value="BB">Bazaarbolt</option>
              <option value="CAFE">BB Cafe</option>
            </select>
          </div>
        </div>
        {type === "checkbox" ? (
          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
            <span className="text-xs font-bold text-zinc-700">{label} Status</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={!!value} onChange={handleChange} />
              <div className="w-12 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        ) : (
          <input 
            type={type} 
            value={value} 
            onChange={handleChange} 
            placeholder={context !== "GLOBAL" ? `Global: ${settings[field]}` : placeholder}
            className="w-full bg-zinc-50 border-none rounded-xl lg:rounded-2xl p-4 lg:p-5 font-bold text-xs lg:text-sm focus:ring-2 ring-primary transition-all shadow-inner"
          />
        )}
      </div>
    );
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
          <p className="text-[10px] lg:text-xs font-bold text-zinc-400 tracking-widest mt-1 uppercase">Control global and section-specific store parameters</p>
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
            <SettingField label="Live Store Status" field="storeOpen" type="checkbox" />
            <SettingField label="Announcement Bar" field="announcement" placeholder="e.g. ⚡️ FLASH SALE: 50% OFF ⚡️" />
            
            <div className="pt-8 border-t border-zinc-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              <SettingField label="Tax Percent (%)" field="taxPercent" type="number" />
              <SettingField label="Handling Charge (₹)" field="handlingCharge" type="number" />
              <SettingField label="Free Delivery Above (₹)" field="freeDeliveryThreshold" type="number" />
              <SettingField label="Small Cart Threshold (₹)" field="smallCartThreshold" type="number" />
            </div>
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-zinc-900 rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <span className="material-symbols-outlined text-8xl">palette</span>
            </div>
            <SettingField label="Primary UI Color" field="primaryColor" type="color" />
          </div>

          <div className="bg-white rounded-[32px] lg:rounded-[40px] p-6 lg:p-8 border border-zinc-100 shadow-sm space-y-6">
            <h4 className="font-headline font-black text-xs lg:text-sm tracking-widest text-zinc-400 uppercase">Payment & Fees</h4>
            <SettingField label="Allow COD" field="codEnabled" type="checkbox" />
            <div className="pt-4 border-t border-zinc-50 space-y-4">
              <SettingField label="Delivery Fee (₹)" field="deliveryFee" type="number" />
              <SettingField label="Small Cart Fee (₹)" field="smallCartFee" type="number" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
