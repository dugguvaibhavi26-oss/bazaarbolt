"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { mapSettings } from "@/lib/mappers";
import { AppSettings } from "@/types";
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
  const [newBanner, setNewBanner] = useState({
    url: "",
    section: "BB" as "BB" | "CAFE",
    title: "",
    subtitle: "",
    redirectUrl: ""
  });
  const [activeBannerTab, setActiveBannerTab] = useState<"BB" | "CAFE">("BB");
  const [bannerRedirectType, setBannerRedirectType] = useState<"NONE" | "CATEGORY" | "PRODUCT" | "CUSTOM">("NONE");

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

  const addBanner = () => {
    if (!newBanner.url) return;
    const currentBanners = settings.heroBanners || [];
    setSettings({ ...settings, heroBanners: [...currentBanners, { ...newBanner }] });
    // Reset but keep the current section
    setNewBanner({ url: "", section: activeBannerTab, title: "", subtitle: "", redirectUrl: "" });
    setBannerRedirectType("NONE");
    toast.success("Banner added locally. Remember to click 'Propagate Changes' to save!", { duration: 4000 });
  };

  const removeBanner = (index: number) => {
    const updated = (settings.heroBanners || []).filter((_, i) => i !== index);
    setSettings({ ...settings, heroBanners: updated });
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

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 lg:mb-4">
                  <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 ml-1 uppercase">Carousel Banners</label>
                  <div className="flex bg-zinc-100 p-1 rounded-xl w-full sm:w-auto">
                    <button 
                      onClick={() => { setActiveBannerTab("BB"); setNewBanner(prev => ({...prev, section: "BB"})); }} 
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[8px] font-black tracking-widest uppercase transition-all ${activeBannerTab === "BB" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
                    >
                      Bazaarbolt
                    </button>
                    <button 
                      onClick={() => { setActiveBannerTab("CAFE"); setNewBanner(prev => ({...prev, section: "CAFE"})); }} 
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[8px] font-black tracking-widest uppercase transition-all ${activeBannerTab === "CAFE" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
                    >
                      BB Cafe
                    </button>
                  </div>
                </div>
                <div className="space-y-4 mb-4 bg-zinc-50 p-4 lg:p-6 rounded-[24px] lg:rounded-[32px] border border-zinc-100 uppercase">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 uppercase">
                    <div className="space-y-1 lg:space-y-1.5 uppercase">
                      <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Image URL</label>
                      <input type="text" value={newBanner.url} onChange={e => setNewBanner({...newBanner, url: e.target.value})} className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase placeholder:uppercase" placeholder="URL..." />
                    </div>
                    <div className="space-y-1 lg:space-y-1.5 uppercase">
                      <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Section</label>
                      <select 
                        value={newBanner.section} 
                        onChange={e => {
                          const val = e.target.value as "BB" | "CAFE";
                          setNewBanner({...newBanner, section: val});
                          setActiveBannerTab(val);
                        }} 
                        className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase"
                      >
                        <option value="BB">BAZAAR BOLT</option>
                        <option value="CAFE">BB CAFE</option>
                      </select>
                    </div>
                    <div className="space-y-1 lg:space-y-1.5 uppercase">
                      <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Title</label>
                      <input type="text" value={newBanner.title} onChange={e => setNewBanner({...newBanner, title: e.target.value})} className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase placeholder:uppercase" placeholder="E.G. FLASH SALE" />
                    </div>
                    <div className="space-y-1 lg:space-y-1.5 uppercase">
                      <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Subtitle</label>
                      <input type="text" value={newBanner.subtitle} onChange={e => setNewBanner({...newBanner, subtitle: e.target.value})} className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase placeholder:uppercase" placeholder="E.G. 50% OFF" />
                    </div>
                    
                    <div className="sm:col-span-2 space-y-2 mt-2 pt-4 border-t border-zinc-200">
                      <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase block">Redirect On Click</label>
                      <div className="flex bg-zinc-200/50 p-1 rounded-xl mb-2 overflow-x-auto hide-scrollbar">
                        {(["NONE", "CATEGORY", "PRODUCT", "CUSTOM"] as const).map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setBannerRedirectType(t);
                              if (t === "NONE") setNewBanner(prev => ({...prev, redirectUrl: ""}));
                              else if (t === "CATEGORY" && categories.length > 0) setNewBanner(prev => ({...prev, redirectUrl: `/category/${categories[0].id}`}));
                              else if (t === "PRODUCT" && products.length > 0) setNewBanner(prev => ({...prev, redirectUrl: `/product/${products[0].id}`}));
                              else if (t === "CUSTOM") setNewBanner(prev => ({...prev, redirectUrl: "/search"}));
                            }}
                            className={`flex-1 py-2 rounded-lg text-[7px] lg:text-[8px] font-black tracking-widest uppercase transition-all whitespace-nowrap px-3 ${bannerRedirectType === t ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      
                      {bannerRedirectType === "CATEGORY" && (
                        <select 
                          value={newBanner.redirectUrl?.replace('/category/', '') || ''}
                          onChange={e => setNewBanner({...newBanner, redirectUrl: `/category/${e.target.value}`})}
                          className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase"
                        >
                          {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      )}
                      
                      {bannerRedirectType === "PRODUCT" && (
                        <select 
                          value={newBanner.redirectUrl?.replace('/product/', '') || ''}
                          onChange={e => setNewBanner({...newBanner, redirectUrl: `/product/${e.target.value}`})}
                          className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase"
                        >
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      )}
                      
                      {bannerRedirectType === "CUSTOM" && (
                        <input
                          type="text"
                          value={newBanner.redirectUrl}
                          onChange={(e) => setNewBanner({ ...newBanner, redirectUrl: e.target.value })}
                          placeholder="e.g. /search"
                          className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold"
                        />
                      )}
                    </div>
                  </div>
                  <button onClick={addBanner} className="w-full bg-primary text-zinc-900 py-3 lg:py-4 rounded-xl font-black text-[9px] lg:text-[10px] tracking-widest active:scale-95 transition-all shadow-lg shadow-primary/10 uppercase">
                    Add Banner
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {(settings.heroBanners || []).map((b, idx) => b.section === activeBannerTab ? (
                    <div key={idx} className="relative group aspect-[21/9] rounded-2xl overflow-hidden border border-zinc-100 shadow-sm uppercase">
                      <img src={b.url} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button onClick={() => removeBanner(idx)} className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-red-500 transition-colors">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[8px] font-black px-2 py-1 rounded-md uppercase">{b.section}</div>
                    </div>
                  ) : null)}
                  {(!settings.heroBanners || settings.heroBanners.filter(b => b.section === activeBannerTab).length === 0) && (
                    <div className="col-span-2 py-10 border-2 border-dashed border-zinc-100 rounded-3xl flex flex-col items-center justify-center opacity-40">
                       <span className="material-symbols-outlined text-4xl mb-2">add_photo_alternate</span>
                       <p className="text-[10px] font-black tracking-widest uppercase">No carousel slides added for this section</p>
                    </div>
                  )}
                </div>
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
