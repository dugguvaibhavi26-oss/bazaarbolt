"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import toast from "react-hot-toast";
import { mapSettings } from "@/lib/mappers";
import { AppSettings, PromoSection, PromoSectionItem } from "@/types";
import { useStore } from "@/store/useStore";
import { BannerCropper } from "@/components/BannerCropper";
import { Portal } from "@/components/Portal";

export default function AdminLayouts() {
  const { categories, products, fetchCatalog } = useStore();
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
    notificationTemplates: {},
    promoSections: [],
    sectionSettings: { BB: {}, CAFE: {} }
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
  const [activeBannerTab, setActiveBannerTab] = useState<"BB" | "CAFE" | "MALL">("BB");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [bannerRedirectType, setBannerRedirectType] = useState<"NONE" | "CATEGORY" | "PRODUCT" | "CUSTOM">("NONE");

  const [newPromoSection, setNewPromoSection] = useState<PromoSection>({
    id: Date.now().toString(),
    type: "grid",
    section: "BB",
    position: "MIDDLE",
    title: "",
    subtitle: "",
    bgColor: "#ffffff",
    textColor: "#000000",
    bgImageUrl: "",
    bgAnimation: "none",
    isCompact: false,
    items: [],
    afterCategoryId: ""
  });
  const [newUnderPriceStore, setNewUnderPriceStore] = useState<PromoSection>({
    id: Date.now().toString(),
    type: "deal_row",
    section: "BB",
    position: "MIDDLE",
    title: "",
    priceLimit: 19,
    sideBannerImageUrl: "",
    manualProductIds: [],
    items: [],
    afterCategoryId: "",
    layout: "sliding"
  });
  const [newDynamicRow, setNewDynamicRow] = useState<PromoSection>({
    id: Date.now().toString(),
    type: "sliding_row",
    section: "BB",
    position: "MIDDLE",
    title: "",
    iconUrl: "",
    filterType: "CATEGORY",
    filterCategoryId: "",
    filterSubcategory: "",
    manualProductIds: [],
    items: [],
    afterCategoryId: "",
    layout: "sliding"
  });
  const [newPromoItem, setNewPromoItem] = useState({ imageUrl: "", redirectUrl: "", label: "", colSpan: 1, rowSpan: 1 });
  const [promoRedirectType, setPromoRedirectType] = useState<"NONE" | "CATEGORY" | "PRODUCT" | "CUSTOM">("NONE");

  // Cropping State
  const [isCropping, setIsCropping] = useState(false);
  const [cropAspect, setCropAspect] = useState(21 / 9);
  const [cropTarget, setCropTarget] = useState<"HERO" | "PROMO_ITEM">("HERO");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "config"), (docSnap) => {
      try {
        if (docSnap.exists()) {
          setSettings(mapSettings(docSnap));
        } else {
          // Initialize with defaults if doc doesn't exist
          setSettings(prev => ({ ...prev, promoSections: [] }));
        }
      } catch (e) {
        console.error("Settings mapping error:", e);
      }
      setLoading(false);
    });
    
    // Ensure catalog data is loaded for category dropdowns
    fetchCatalog();
    
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

  const handleCroppedImage = async (blob: Blob) => {
    setIsCropping(false);
    setIsUploading(true);
    const toastId = toast.loading("Uploading processed asset...");

    try {
      const storageRef = ref(storage, `banners/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      if (cropTarget === "HERO") {
        setNewBanner({ ...newBanner, url });
      } else {
        setNewPromoItem({ ...newPromoItem, imageUrl: url });
      }
      toast.success("Asset ready!", { id: toastId });
    } catch (err: any) {
      console.error("Firebase Storage Error:", err);
      if (err.code === 'storage/retry-limit-exceeded') {
        toast.error("Upload timed out. Check your connection or Storage Rules.", { id: toastId });
      } else if (err.code === 'storage/unauthorized') {
        toast.error("Permission denied. Check Storage Rules in Console.", { id: toastId });
      } else {
        toast.error(`Upload failed: ${err.message}`, { id: toastId });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const addBanner = async () => {
    if (!newBanner.url) return;
    const tid = toast.loading("Saving banner...");
    try {
      const currentBanners = settings.heroBanners || [];
      const updatedBanners = [...currentBanners, { ...newBanner }];
      await setDoc(doc(db, "settings", "config"), { heroBanners: updatedBanners }, { merge: true });
      setNewBanner({ url: "", section: activeBannerTab, title: "", subtitle: "", redirectUrl: "" });
      setBannerRedirectType("NONE");
      toast.success("Banner added!", { id: tid });
    } catch (e) {
      toast.error("Failed to save banner", { id: tid });
    }
  };

  const removeBanner = async (index: number) => {
    const tid = toast.loading("Removing banner...");
    try {
      const updated = (settings.heroBanners || []).filter((_, i) => i !== index);
      await setDoc(doc(db, "settings", "config"), { heroBanners: updated }, { merge: true });
      toast.success("Banner removed", { id: tid });
    } catch (e) {
      toast.error("Failed to remove banner", { id: tid });
    }
  };

  const addPromoItem = () => {
    if (!newPromoItem.imageUrl) return;
    setNewPromoSection(prev => ({
      ...prev,
      items: [...prev.items, { ...newPromoItem }]
    }));
    setNewPromoItem({ imageUrl: "", redirectUrl: "", label: "", colSpan: 1, rowSpan: 1 });
    setPromoRedirectType("NONE");
  };

  const removePromoItem = (index: number) => {
    setNewPromoSection(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const addPromoSection = async () => {
    const tid = toast.loading(editingSectionId ? "Updating section..." : "Adding section...");
    try {
      const sectionData = { ...newPromoSection, section: activeBannerTab, id: editingSectionId || Date.now().toString() };
      let updatedSections = [...(settings.promoSections || [])];

      if (editingSectionId) {
        updatedSections = updatedSections.map(s => s.id === editingSectionId ? sectionData : s);
      } else {
        updatedSections.push(sectionData);
      }

      await setDoc(doc(db, "settings", "config"), { promoSections: updatedSections }, { merge: true });
      setSettings(prev => ({ ...prev, promoSections: updatedSections }));
      
      toast.success(editingSectionId ? "Section updated!" : "Section added!", { id: tid });
      setNewPromoSection({
        id: Date.now().toString(),
        type: "grid",
        section: activeBannerTab,
        position: "MIDDLE",
        title: "",
        subtitle: "",
        bgColor: "#ffffff",
        textColor: "#000000",
        bgImageUrl: "",
        bgAnimation: "none",
        isCompact: false,
        items: [],
        afterCategoryId: ""
      });
      setEditingSectionId(null);
    } catch (e) {
      console.error("Save error:", e);
      toast.error("Failed to save section", { id: tid });
    }
  };

  const addDynamicRow = async () => {
    if (!newDynamicRow.title && newDynamicRow.filterType === 'CATEGORY' && !newDynamicRow.filterCategoryId) {
      toast.error("Please provide a title or select a category");
      return;
    }

    const tid = toast.loading(editingSectionId ? "Updating section..." : "Adding section...");
    try {
      const sectionData = { ...newDynamicRow, section: activeBannerTab, id: editingSectionId || Date.now().toString() };
      let updatedSections = [...(settings.promoSections || [])];

      if (editingSectionId) {
        updatedSections = updatedSections.map(s => s.id === editingSectionId ? sectionData : s);
      } else {
        updatedSections.push(sectionData);
      }

      await setDoc(doc(db, "settings", "config"), { promoSections: updatedSections }, { merge: true });
      setSettings(prev => ({ ...prev, promoSections: updatedSections }));

      toast.success(editingSectionId ? "Section updated!" : "Section added!", { id: tid });
      setNewDynamicRow({
        id: Date.now().toString(),
        type: "sliding_row",
        section: activeBannerTab,
        position: "MIDDLE",
        title: "",
        iconUrl: "",
        filterType: "CATEGORY",
        filterCategoryId: "",
        filterSubcategory: "",
        manualProductIds: [],
        items: [],
        afterCategoryId: "",
        layout: "sliding"
      });
      setEditingSectionId(null);
    } catch (e) {
      console.error("Save error:", e);
      toast.error("Failed to save section", { id: tid });
    }
  };

  const addUnderPriceStore = async () => {
    if (!newUnderPriceStore.title) {
      toast.error("Please provide a title");
      return;
    }

    const tid = toast.loading(editingSectionId ? "Updating section..." : "Adding section...");
    try {
      const sectionData = { ...newUnderPriceStore, section: activeBannerTab, id: editingSectionId || Date.now().toString() };
      let updatedSections = [...(settings.promoSections || [])];

      if (editingSectionId) {
        updatedSections = updatedSections.map(s => s.id === editingSectionId ? sectionData : s);
      } else {
        updatedSections.push(sectionData);
      }

      await setDoc(doc(db, "settings", "config"), { promoSections: updatedSections }, { merge: true });
      setSettings(prev => ({ ...prev, promoSections: updatedSections }));

      toast.success(editingSectionId ? "Section updated!" : "Section added!", { id: tid });
      setNewUnderPriceStore({
        id: Date.now().toString(),
        type: "deal_row",
        section: activeBannerTab,
        position: "MIDDLE",
        title: "",
        priceLimit: 19,
        sideBannerImageUrl: "",
        manualProductIds: [],
        items: [],
        afterCategoryId: "",
        layout: "sliding",
        filterCategoryId: ""
      });
      setEditingSectionId(null);
    } catch (e) {
      console.error("Save error:", e);
      toast.error("Failed to save section", { id: tid });
    }
  };

  const startEditSection = (section: PromoSection) => {
    setEditingSectionId(section.id);
    const sanitized = {
      title: "",
      subtitle: "",
      bgColor: "#ffffff",
      textColor: "#000000",
      bgImageUrl: "",
      bgAnimation: "none",
      afterCategoryId: "",
      items: [],
      manualProductIds: [],
      ...section
    };
    if (section.type === 'sliding_row' || section.type === 'deal_row') {
      setNewDynamicRow(sanitized as any);
    } else {
      setNewPromoSection(sanitized as any);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removePromoSection = async (id: string) => {
    const tid = toast.loading("Removing section...");
    try {
      const updated = (settings.promoSections || []).filter((s) => s.id !== id);
      await setDoc(doc(db, "settings", "config"), { promoSections: updated }, { merge: true });
      toast.success("Section removed", { id: tid });
    } catch (e) {
      toast.error("Failed to remove section", { id: tid });
    }
  };

  const moveSection = async (id: string, direction: 'up' | 'down') => {
    const allSections = [...(settings.promoSections || [])];
    const platformSections = allSections.filter(s => s.section === activeBannerTab);
    
    const currentIndex = platformSections.findIndex(s => s.id === id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= platformSections.length) return;
    
    const movingSectionId = platformSections[currentIndex].id;
    const neighborSectionId = platformSections[targetIndex].id;
    
    // Swap them in the GLOBAL array
    const globalIdx1 = allSections.findIndex(s => s.id === movingSectionId);
    const globalIdx2 = allSections.findIndex(s => s.id === neighborSectionId);
    
    const temp = allSections[globalIdx1];
    allSections[globalIdx1] = allSections[globalIdx2];
    allSections[globalIdx2] = temp;

    try {
      await setDoc(doc(db, "settings", "config"), { promoSections: allSections }, { merge: true });
    } catch (e) {
      console.error("Reorder error:", e);
      toast.error("Failed to reorder");
    }
  };

  if (loading) return (
    <div className="max-w-3xl space-y-6 animate-pulse">
      <div className="h-12 bg-white rounded-2xl w-1/3"/>
      <div className="h-96 bg-white rounded-[40px]"/>
    </div>
  );

  return (
    <>
      <div className="max-w-4xl space-y-6 lg:space-y-8 pb-32">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl lg:text-2xl font-black text-zinc-900 tracking-tight">Layouts & Banners</h3>
          <p className="text-[10px] lg:text-xs font-bold text-zinc-400 tracking-widest mt-1 uppercase">Control homepage appearance and promotions</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="w-full lg:w-auto bg-zinc-900 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-2xl font-black text-[9px] lg:text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-black shadow-xl active:scale-95 disabled:opacity-50 transition-all uppercase"
        >
          <span className="material-symbols-outlined text-sm">{saving ? 'sync' : 'save_as'}</span>
          {saving ? 'Syncing...' : 'Propagate Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:gap-8">
        <div className="bg-white rounded-[32px] lg:rounded-[40px] p-6 lg:p-10 shadow-sm border border-zinc-100 space-y-8 lg:space-y-10">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 lg:mb-4">
              <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 ml-1 uppercase">Carousel Banners</label>
              <div className="flex bg-zinc-100 p-1 rounded-xl w-full sm:w-auto">
                <button 
                  onClick={() => { 
                    setActiveBannerTab("BB"); 
                    setNewBanner(prev => ({...prev, section: "BB"})); 
                    setNewPromoSection(prev => ({...prev, section: "BB"}));
                    setNewUnderPriceStore(prev => ({...prev, section: "BB"}));
                    setNewDynamicRow(prev => ({...prev, section: "BB"}));
                  }} 
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[8px] font-black tracking-widest uppercase transition-all ${activeBannerTab === "BB" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
                >
                  Bazaarbolt
                </button>
                <button 
                  onClick={() => { 
                    setActiveBannerTab("CAFE"); 
                    setNewBanner(prev => ({...prev, section: "CAFE"})); 
                    setNewPromoSection(prev => ({...prev, section: "CAFE"}));
                    setNewUnderPriceStore(prev => ({...prev, section: "CAFE"}));
                    setNewDynamicRow(prev => ({...prev, section: "CAFE"}));
                  }} 
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[8px] font-black tracking-widest uppercase transition-all ${activeBannerTab === "CAFE" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
                >
                  BB Cafe
                </button>
                <button 
                  onClick={() => { 
                    setActiveBannerTab("MALL"); 
                    setNewBanner(prev => ({...prev, section: "MALL"})); 
                    setNewPromoSection(prev => ({...prev, section: "MALL"}));
                    setNewUnderPriceStore(prev => ({...prev, section: "MALL"}));
                    setNewDynamicRow(prev => ({...prev, section: "MALL"}));
                  }} 
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[8px] font-black tracking-widest uppercase transition-all ${activeBannerTab === "MALL" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
                >
                  BB Mall
                </button>
              </div>
            </div>
            <div className="space-y-4 mb-4 bg-zinc-50 p-4 lg:p-6 rounded-[24px] lg:rounded-[32px] border border-zinc-100 uppercase">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 uppercase">
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Image URL</label>
                  <div className="flex gap-2">
                    <input type="text" value={newBanner.url} onChange={e => setNewBanner({...newBanner, url: e.target.value})} className="flex-1 bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase placeholder:uppercase" placeholder="URL..." />
                    <button 
                      type="button"
                      onClick={() => { setCropAspect(21/9); setCropTarget("HERO"); setIsCropping(true); }}
                      className="bg-zinc-900 text-white px-4 rounded-xl flex items-center justify-center hover:bg-black transition-all"
                      title="Open Crop Tool"
                    >
                      <span className="material-symbols-outlined text-sm">crop</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Section</label>
                  <select 
                    value={newBanner.section} 
                    onChange={e => {
                      const val = e.target.value as "BB" | "CAFE" | "MALL";
                      setNewBanner({...newBanner, section: val});
                      setActiveBannerTab(val);
                    }} 
                    className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase"
                  >
                    <option value="BB">BAZAAR BOLT</option>
                    <option value="CAFE">BB CAFE</option>
                    <option value="MALL">BB MALL</option>
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

          {/* UNDER PRICE STORES UI */}
          <div className="pt-8 border-t border-zinc-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 lg:mb-4">
              <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 ml-1 uppercase">Under Price Stores (e.g. Under 19 Store)</label>
            </div>
            <div className="space-y-4 mb-4 bg-zinc-50 p-4 lg:p-6 rounded-[24px] lg:rounded-[32px] border border-zinc-100 uppercase">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 uppercase">
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Store Title</label>
                  <input type="text" value={newUnderPriceStore.title} onChange={e => setNewUnderPriceStore({...newUnderPriceStore, title: e.target.value})} className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase placeholder:uppercase" placeholder="E.G. UNDER 19 STORE" />
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Applied To Section</label>
                  <select 
                    value={newUnderPriceStore.section} 
                    onChange={e => setNewUnderPriceStore({...newUnderPriceStore, section: e.target.value as "BB" | "CAFE" | "MALL"})} 
                    className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase"
                  >
                    <option value="BB">BAZAAR BOLT</option>
                    <option value="CAFE">BB CAFE</option>
                    <option value="MALL">BB MALL</option>
                  </select>
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Products Layout</label>
                  <select 
                    value={newUnderPriceStore.layout || "sliding"} 
                    onChange={e => setNewUnderPriceStore({...newUnderPriceStore, layout: e.target.value as "max4row" | "sliding"})} 
                    className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase"
                  >
                    <option value="sliding">SLIDING</option>
                    <option value="max4row">MAX 4 ROW</option>
                  </select>
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Max Price Limit (₹)</label>
                  <input type="number" value={newUnderPriceStore.priceLimit} onChange={e => setNewUnderPriceStore({...newUnderPriceStore, priceLimit: parseFloat(e.target.value) || 0})} className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase" />
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Side Banner Image URL</label>
                  <input type="text" value={newUnderPriceStore.sideBannerImageUrl} onChange={e => setNewUnderPriceStore({...newUnderPriceStore, sideBannerImageUrl: e.target.value})} className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase" placeholder="URL..." />
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Filter By Category (Optional)</label>
                  <select 
                    value={newUnderPriceStore.filterCategoryId || ""} 
                    onChange={e => setNewUnderPriceStore({...newUnderPriceStore, filterCategoryId: e.target.value})} 
                    className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase"
                  >
                    <option value="">ALL CATEGORIES</option>
                    {categories.map(c => (
                      <React.Fragment key={c.id}>
                        <option value={c.id}>{c.label}</option>
                        {c.subcategories && Array.isArray(c.subcategories) && c.subcategories.map((sub: any) => {
                          const subLabel = typeof sub === 'string' ? sub : sub.label;
                          const subId = typeof sub === 'string' ? sub : (sub.id || sub.label);
                          return (
                            <option key={`${c.id}_${subId}`} value={subId}>— {subLabel} ({c.label})</option>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Place Under Category</label>
                  <select 
                    value={newUnderPriceStore.afterCategoryId || newUnderPriceStore.position || "MIDDLE"} 
                    onChange={e => {
                      const val = e.target.value;
                      const staticPositions = ["TOP", "AFTER_HERO", "AFTER_CATEGORIES", "BOTTOM", "MIDDLE"];
                      if (staticPositions.includes(val)) {
                        setNewUnderPriceStore({...newUnderPriceStore, position: val as any, afterCategoryId: ""});
                      } else {
                        setNewUnderPriceStore({...newUnderPriceStore, afterCategoryId: val, position: "MIDDLE"});
                      }
                    }} 
                    className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase"
                  >
                    <option value="TOP">PAGE TOP</option>
                    <option value="AFTER_HERO">AFTER HERO BANNERS</option>
                    <option value="AFTER_CATEGORIES">AFTER ALL CATEGORIES</option>
                    <option value="BOTTOM">PAGE BOTTOM</option>
                    <optgroup label="ANCHOR TO CATEGORY">
                      {categories.filter(c => !c.section || c.section === activeBannerTab).map(c => (
                        <option key={c.id} value={c.id}>UNDER {c.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="ANCHOR TO SECTIONS">
                      {settings.promoSections?.filter(s => s.section === activeBannerTab && s.id !== newUnderPriceStore.id).map(s => (
                        <option key={s.id} value={s.id}>AFTER {s.title || (s.filterType === 'BESTSELLERS' ? 'Bestsellers' : s.filterType === 'NEW_ARRIVALS' ? 'New Arrivals' : `${s.type} Section`)}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                
                <div className="space-y-1 lg:space-y-1.5 uppercase sm:col-span-2">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase block">Featured Products (Optional - Auto-filled by Price Limit)</label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto bg-white border border-zinc-100 rounded-xl p-3">
                    {products.filter(p => newUnderPriceStore.priceLimit ? p.price <= newUnderPriceStore.priceLimit : true).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const ids = newUnderPriceStore.manualProductIds || [];
                          if (ids.includes(p.id)) {
                            setNewUnderPriceStore({...newUnderPriceStore, manualProductIds: ids.filter(id => id !== p.id)});
                          } else {
                            if (ids.length >= 8) {
                              toast.error("You can only select up to 8 products");
                              return;
                            }
                            setNewUnderPriceStore({...newUnderPriceStore, manualProductIds: [...ids, p.id]});
                          }
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[8px] font-bold tracking-widest uppercase transition-all ${newUnderPriceStore.manualProductIds?.includes(p.id) ? 'bg-primary text-zinc-900 border border-primary' : 'bg-zinc-50 text-zinc-500 border border-zinc-200'}`}
                      >
                        <img src={p.image} className="w-4 h-4 object-contain rounded" alt="" />
                        {p.name.length > 20 ? p.name.substring(0, 20) + "..." : p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={addUnderPriceStore} className="w-full bg-primary text-zinc-900 py-3 lg:py-4 rounded-xl font-black text-[9px] lg:text-[10px] tracking-widest active:scale-95 transition-all shadow-lg shadow-primary/10 uppercase mt-2">
                Add Under Price Store
              </button>
            </div>

            <div className="space-y-4">
              {(settings.promoSections || []).filter(s => s.type === "deal_row").map((s) => s.section === activeBannerTab ? (
                <div key={s.id} className="relative rounded-2xl overflow-hidden border border-zinc-200 shadow-sm p-4 bg-zinc-50">
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div>
                      <h4 className="font-headline font-black text-sm uppercase text-zinc-900">{s.title}</h4>
                      <p className="text-[8px] font-bold text-zinc-400 tracking-widest uppercase">
                        Under ₹{s.priceLimit} • {s.afterCategoryId ? `After Category: ${categories.find(c => c.id === s.afterCategoryId)?.label}` : `Position: ${s.position}`}
                      </p>
                    </div>
                    <button onClick={() => removePromoSection(s.id)} className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white p-1.5 rounded-lg transition-colors">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ) : null)}
            </div>
          </div>

          {/* DYNAMIC CUSTOMER ROWS UI */}
          <div className="pt-8 border-t border-zinc-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 lg:mb-4">
              <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 ml-1 uppercase">Customer Panel Sections (Bestsellers, etc)</label>
            </div>
            <div className="space-y-4 mb-4 bg-zinc-50 p-4 lg:p-6 rounded-[24px] lg:rounded-[32px] border border-zinc-100 uppercase">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 uppercase">
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Section Title</label>
                  <input type="text" value={newDynamicRow.title || ""} onChange={e => setNewDynamicRow({...newDynamicRow, title: e.target.value})} className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase placeholder:uppercase" placeholder="E.G. BESTSELLERS" />
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Applied To Section</label>
                  <select 
                    value={newDynamicRow.section} 
                    onChange={e => setNewDynamicRow({...newDynamicRow, section: e.target.value as "BB" | "CAFE" | "MALL"})} 
                    className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase"
                  >
                    <option value="BB">BAZAAR BOLT</option>
                    <option value="CAFE">BB CAFE</option>
                    <option value="MALL">BB MALL</option>
                  </select>
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Products Layout</label>
                  <select 
                    value={newDynamicRow.layout || "sliding"} 
                    onChange={e => setNewDynamicRow({...newDynamicRow, layout: e.target.value as "max4row" | "sliding"})} 
                    className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase"
                  >
                    <option value="sliding">SLIDING</option>
                    <option value="max4row">MAX 4 ROW</option>
                  </select>
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Filter Type</label>
                  <select 
                    value={newDynamicRow.filterType || "CATEGORY"} 
                    onChange={e => {
                      const type = e.target.value as any;
                      setNewDynamicRow({...newDynamicRow, filterType: type});
                    }} 
                    className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase"
                  >
                    <option value="CATEGORY">SPECIFIC CATEGORY</option>
                    <option value="BESTSELLERS">BESTSELLERS</option>
                    <option value="NEW_ARRIVALS">NEW ARRIVALS</option>
                  </select>
                </div>

                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Target Category (If Type=Category)</label>
                  <select 
                    value={newDynamicRow.filterCategoryId || ""} 
                    onChange={e => setNewDynamicRow({...newDynamicRow, filterCategoryId: e.target.value})} 
                    className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase"
                  >
                    <option value="">ALL CATEGORIES</option>
                    {categories.map(c => (
                      <React.Fragment key={c.id}>
                        <option value={c.id}>{c.label}</option>
                        {c.subcategories && Array.isArray(c.subcategories) && c.subcategories.map((sub: any) => {
                          const subLabel = typeof sub === 'string' ? sub : sub.label;
                          const subId = typeof sub === 'string' ? sub : (sub.id || sub.label);
                          return (
                            <option key={`${c.id}_${subId}`} value={subId}>— {subLabel} ({c.label})</option>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Placement</label>
                  <select 
                    value={newDynamicRow.afterCategoryId || newDynamicRow.position || "MIDDLE"} 
                    onChange={e => {
                      const val = e.target.value;
                      const staticPositions = ["TOP", "AFTER_HERO", "AFTER_CATEGORIES", "BOTTOM", "MIDDLE"];
                      if (staticPositions.includes(val)) {
                        setNewDynamicRow({...newDynamicRow, position: val as any, afterCategoryId: ""});
                      } else {
                        setNewDynamicRow({...newDynamicRow, afterCategoryId: val, position: "MIDDLE"});
                      }
                    }} 
                    className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase"
                  >
                    <option value="TOP">PAGE TOP</option>
                    <option value="AFTER_HERO">AFTER HERO BANNERS</option>
                    <option value="AFTER_CATEGORIES">AFTER ALL CATEGORIES</option>
                    <option value="BOTTOM">PAGE BOTTOM</option>
                    <optgroup label="ANCHOR TO CATEGORY">
                      {categories.filter(c => !c.section || c.section === activeBannerTab).map(c => (
                        <option key={c.id} value={c.id}>UNDER {c.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="ANCHOR TO SECTIONS">
                      {settings.promoSections?.filter(s => s.section === activeBannerTab && s.id !== newDynamicRow.id).map(s => (
                        <option key={s.id} value={s.id}>AFTER {s.title || (s.filterType === 'BESTSELLERS' ? 'Bestsellers' : s.filterType === 'NEW_ARRIVALS' ? 'New Arrivals' : `${s.type} Section`)}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                
                <div className="space-y-1 lg:space-y-1.5 uppercase sm:col-span-2">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase block">Featured Products (Optional - Overrides Category Filter)</label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto bg-white border border-zinc-100 rounded-xl p-3">
                    {products.filter(p => {
                      if (!newDynamicRow.filterCategoryId) return true;
                      const target = newDynamicRow.filterCategoryId.toLowerCase().trim();
                      const pCat = p.category?.toLowerCase().trim();
                      const pSub = p.subcategory?.toLowerCase().trim();
                      const cat = categories.find(c => c.id === newDynamicRow.filterCategoryId);
                      const catLabel = cat?.label?.toLowerCase().trim();

                      const isCatMatch = pCat === target || pCat === catLabel;
                      const isSubMatch = pSub === target || categories.some(c => 
                        c.subcategories?.some((sub: any) => {
                          const sId = (typeof sub === 'string' ? sub : (sub.id || sub.label)).toLowerCase().trim();
                          const sLabel = (typeof sub === 'string' ? sub : sub.label).toLowerCase().trim();
                          return sId === target && pSub === sLabel;
                        })
                      );

                      return isCatMatch || isSubMatch;
                    }).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const ids = newDynamicRow.manualProductIds || [];
                          if (ids.includes(p.id)) {
                            setNewDynamicRow({...newDynamicRow, manualProductIds: ids.filter(id => id !== p.id)});
                          } else {
                            if (ids.length >= 20) {
                              toast.error("You can only select up to 20 products");
                              return;
                            }
                            setNewDynamicRow({...newDynamicRow, manualProductIds: [...ids, p.id]});
                          }
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[8px] font-bold tracking-widest uppercase transition-all ${newDynamicRow.manualProductIds?.includes(p.id) ? 'bg-primary text-zinc-900 border border-primary' : 'bg-zinc-50 text-zinc-500 border border-zinc-200'}`}
                      >
                        <img src={p.image} className="w-4 h-4 object-contain rounded" alt="" />
                        {p.name.length > 20 ? p.name.substring(0, 20) + "..." : p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={addDynamicRow} className={`w-full py-3 lg:py-4 rounded-xl font-black text-[9px] lg:text-[10px] tracking-widest active:scale-95 transition-all shadow-lg uppercase mt-2 ${editingSectionId ? 'bg-zinc-900 text-white' : 'bg-primary text-zinc-900'}`}>
                {editingSectionId ? 'Update Section Row' : 'Add Section Row'}
              </button>
              {editingSectionId && (
                <button onClick={() => { 
                  setEditingSectionId(null); 
                  setNewDynamicRow({
                    id: Date.now().toString(),
                    type: "sliding_row",
                    section: activeBannerTab,
                    position: "MIDDLE",
                    title: "",
                    iconUrl: "",
                    filterType: "CATEGORY",
                    filterCategoryId: "",
                    filterSubcategory: "",
                    manualProductIds: [],
                    items: [],
                    afterCategoryId: "",
                    layout: "sliding"
                  }); 
                }} className="w-full bg-zinc-100 text-zinc-400 py-3 rounded-xl font-black text-[9px] uppercase mt-2">
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="space-y-4">
              {(settings.promoSections || []).filter(s => s.type === "sliding_row" || s.type === "deal_row").map((s) => (s.section === activeBannerTab || (!s.section && activeBannerTab === "BB")) ? (
                <div key={s.id} className="relative rounded-2xl overflow-hidden border border-zinc-200 shadow-sm p-4 bg-zinc-50">
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-headline font-black text-sm uppercase text-zinc-900">{s.title || (s.filterType === 'BESTSELLERS' ? 'Bestsellers' : s.filterType === 'NEW_ARRIVALS' ? 'New Arrivals' : 'Category Row')}</h4>
                        <p className="text-[8px] font-bold text-zinc-400 tracking-widest uppercase">
                          Type: {s.filterType || 'CATEGORY'} • {s.filterCategoryId ? `Category: ${categories.find(c => c.id === s.filterCategoryId)?.label}` : 'All Products'} • {s.afterCategoryId ? `After: ${categories.find(c => c.id === s.afterCategoryId)?.label}` : `Pos: ${s.position}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => moveSection(s.id, 'up')} className="p-1.5 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors">
                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                      </button>
                      <button onClick={() => moveSection(s.id, 'down')} className="p-1.5 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors">
                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                      </button>
                      <button onClick={() => startEditSection(s)} className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => removePromoSection(s.id)} className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white p-1.5 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null)}
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 lg:mb-4">
              <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 ml-1 uppercase">Other Promotional Layout Sections</label>
            </div>
            <div className="space-y-4 mb-4 bg-zinc-50 p-4 lg:p-6 rounded-[24px] lg:rounded-[32px] border border-zinc-100 uppercase">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 uppercase">
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Section Type</label>
                  <select value={newPromoSection.type} onChange={e => setNewPromoSection({...newPromoSection, type: e.target.value as any})} className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase">
                    <option value="banner">Wide Banner</option>
                    <option value="grid">Grid Items</option>
                    <option value="category_grid">Category Grid</option>
                  </select>
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Applied To Section</label>
                  <select 
                    value={newPromoSection.section} 
                    onChange={e => setNewPromoSection({...newPromoSection, section: e.target.value as "BB" | "CAFE" | "MALL"})} 
                    className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase"
                  >
                    <option value="BB">BAZAAR BOLT</option>
                    <option value="CAFE">BB CAFE</option>
                    <option value="MALL">BB MALL</option>
                  </select>
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Display Placement</label>
                  <select 
                    value={newPromoSection.afterCategoryId || newPromoSection.position || "MIDDLE"} 
                    onChange={e => {
                      const val = e.target.value;
                      const staticPositions = ["TOP", "AFTER_HERO", "AFTER_CATEGORIES", "BOTTOM", "MIDDLE"];
                      if (staticPositions.includes(val)) {
                        setNewPromoSection({...newPromoSection, position: val as any, afterCategoryId: ""});
                      } else {
                        setNewPromoSection({...newPromoSection, afterCategoryId: val, position: "MIDDLE"});
                      }
                    }} 
                    className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase"
                  >
                    <option value="TOP">PAGE TOP</option>
                    <option value="AFTER_HERO">AFTER HERO BANNERS</option>
                    <option value="AFTER_CATEGORIES">AFTER ALL CATEGORIES</option>
                    <option value="BOTTOM">PAGE BOTTOM</option>
                    <optgroup label="ANCHOR TO CATEGORY">
                      {categories.filter(c => !c.section || c.section === activeBannerTab).map(c => (
                        <option key={c.id} value={c.id}>UNDER {c.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="ANCHOR TO SECTIONS">
                      {settings.promoSections?.filter(s => s.section === activeBannerTab && s.id !== newPromoSection.id).map(s => (
                        <option key={s.id} value={s.id}>AFTER {s.title || `${s.type} Section`}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Background Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={newPromoSection.bgColor} onChange={e => setNewPromoSection({...newPromoSection, bgColor: e.target.value})} className="w-10 h-10 bg-white border border-zinc-100 rounded-xl cursor-pointer" />
                    <input type="text" value={newPromoSection.bgColor} onChange={e => setNewPromoSection({...newPromoSection, bgColor: e.target.value})} className="flex-1 bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase" />
                  </div>
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Title (Optional)</label>
                  <input type="text" value={newPromoSection.title} onChange={e => setNewPromoSection({...newPromoSection, title: e.target.value})} className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase placeholder:uppercase" placeholder="E.G. DEALS STARTING AT ₹9" />
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={newPromoSection.textColor} onChange={e => setNewPromoSection({...newPromoSection, textColor: e.target.value})} className="w-10 h-10 bg-white border border-zinc-100 rounded-xl cursor-pointer" />
                    <input type="text" value={newPromoSection.textColor} onChange={e => setNewPromoSection({...newPromoSection, textColor: e.target.value})} className="flex-1 bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase" />
                  </div>
                </div>

                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">Section BG Image URL</label>
                  <input type="text" value={newPromoSection.bgImageUrl} onChange={e => setNewPromoSection({...newPromoSection, bgImageUrl: e.target.value})} className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase" placeholder="URL..." />
                </div>
                <div className="space-y-1 lg:space-y-1.5 uppercase">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-400 ml-1 uppercase">BG Animation</label>
                  <select value={newPromoSection.bgAnimation} onChange={e => setNewPromoSection({...newPromoSection, bgAnimation: e.target.value as any})} className="w-full bg-white border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase">
                    <option value="none">None</option>
                    <option value="parallax">Parallax Scroll</option>
                    <option value="zoom">Slow Zoom</option>
                  </select>
                </div>
                <div className="space-y-1 lg:space-y-1.5 flex items-end pb-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={newPromoSection.isCompact} onChange={e => setNewPromoSection({...newPromoSection, isCompact: e.target.checked})} className="w-5 h-5 rounded-md border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-[9px] lg:text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-zinc-900 transition-colors">Compact Layout</span>
                  </label>
                </div>

                {newPromoSection.type !== "deal_row" && (
                  <div className="sm:col-span-2 space-y-2 mt-4 p-4 border border-zinc-200 rounded-2xl bg-white">
                    <label className="text-[9px] lg:text-[10px] font-black text-zinc-900 mb-2 uppercase block">Add Items to Section</label>
                    {newPromoSection.type === "grid" && (
                      <div className="sm:col-span-2 mb-4 bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
                        <label className="text-[9px] lg:text-[10px] font-black text-zinc-900 mb-2 uppercase block">Quick Grid Templates</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <button type="button" onClick={() => {
                            setNewPromoSection({...newPromoSection, items: [
                              { imageUrl: "", redirectUrl: "", label: "", colSpan: 1, rowSpan: 2 },
                              { imageUrl: "", redirectUrl: "", label: "", colSpan: 1, rowSpan: 1 },
                              { imageUrl: "", redirectUrl: "", label: "", colSpan: 1, rowSpan: 1 },
                              { imageUrl: "", redirectUrl: "", label: "", colSpan: 1, rowSpan: 1 },
                              { imageUrl: "", redirectUrl: "", label: "", colSpan: 1, rowSpan: 1 }
                            ]});
                          }} className="bg-white border border-zinc-200 p-2 rounded-xl text-[8px] font-bold text-zinc-600 hover:border-indigo-600 hover:text-indigo-600 transition-all text-center">
                            Hero Left + 4 Grid
                          </button>
                          <button type="button" onClick={() => {
                            setNewPromoSection({...newPromoSection, items: [
                              { imageUrl: "", redirectUrl: "", label: "", colSpan: 1, rowSpan: 1 },
                              { imageUrl: "", redirectUrl: "", label: "", colSpan: 1, rowSpan: 1 },
                              { imageUrl: "", redirectUrl: "", label: "", colSpan: 1, rowSpan: 1 },
                              { imageUrl: "", redirectUrl: "", label: "", colSpan: 1, rowSpan: 1 }
                            ]});
                          }} className="bg-white border border-zinc-200 p-2 rounded-xl text-[8px] font-bold text-zinc-600 hover:border-indigo-600 hover:text-indigo-600 transition-all text-center">
                            4 Equal Squares
                          </button>
                          <button type="button" onClick={() => {
                            setNewPromoSection({...newPromoSection, items: [
                              { imageUrl: "", redirectUrl: "", label: "", colSpan: 2, rowSpan: 1 },
                              { imageUrl: "", redirectUrl: "", label: "", colSpan: 1, rowSpan: 1 },
                              { imageUrl: "", redirectUrl: "", label: "", colSpan: 1, rowSpan: 1 }
                            ]});
                          }} className="bg-white border border-zinc-200 p-2 rounded-xl text-[8px] font-bold text-zinc-600 hover:border-indigo-600 hover:text-indigo-600 transition-all text-center">
                            Hero Top + 2 Grid
                          </button>
                          <button type="button" onClick={() => setNewPromoSection({...newPromoSection, items: []})} className="bg-white border border-zinc-200 p-2 rounded-xl text-[8px] font-bold text-red-500 hover:bg-red-50 transition-all text-center">
                            Clear Layout
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div className="flex gap-2">
                        <input type="text" value={newPromoItem.imageUrl} onChange={e => setNewPromoItem({...newPromoItem, imageUrl: e.target.value})} className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase placeholder:uppercase" placeholder="Image URL..." />
                        <button 
                          type="button"
                          onClick={() => { 
                            setCropAspect(newPromoSection.type === 'banner' ? 21/9 : 1); 
                            setCropTarget("PROMO_ITEM"); 
                            setIsCropping(true); 
                          }}
                          className="bg-zinc-900 text-white px-4 rounded-xl flex items-center justify-center hover:bg-black transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">crop</span>
                        </button>
                      </div>
                      <input type="text" value={newPromoItem.label} onChange={e => setNewPromoItem({...newPromoItem, label: e.target.value})} className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-[10px] lg:text-xs font-bold uppercase placeholder:uppercase" placeholder="Label / Price (e.g. ₹99)" />
                    </div>
                    
                    {newPromoSection.type === "grid" && (
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-zinc-400 uppercase">Width (Col Span: 1-4)</label>
                          <input type="number" min="1" max="4" value={newPromoItem.colSpan} onChange={e => setNewPromoItem({...newPromoItem, colSpan: parseInt(e.target.value) || 1})} className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-2.5 text-[10px] font-bold" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-zinc-400 uppercase">Height (Row Span: 1-4)</label>
                          <input type="number" min="1" max="4" value={newPromoItem.rowSpan} onChange={e => setNewPromoItem({...newPromoItem, rowSpan: parseInt(e.target.value) || 1})} className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-2.5 text-[10px] font-bold" />
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-zinc-400 ml-1 uppercase block">Redirect On Click</label>
                      <div className="flex bg-zinc-100 p-1 rounded-xl mb-2 overflow-x-auto hide-scrollbar">
                        {(["NONE", "CATEGORY", "PRODUCT", "CUSTOM"] as const).map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setPromoRedirectType(t);
                              if (t === "NONE") setNewPromoItem(prev => ({...prev, redirectUrl: ""}));
                              else if (t === "CATEGORY" && categories.length > 0) setNewPromoItem(prev => ({...prev, redirectUrl: `/category/${categories[0].id}`}));
                              else if (t === "PRODUCT" && products.length > 0) setNewPromoItem(prev => ({...prev, redirectUrl: `/product/${products[0].id}`}));
                              else if (t === "CUSTOM") setNewPromoItem(prev => ({...prev, redirectUrl: "/search"}));
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-[7px] font-black tracking-widest uppercase transition-all whitespace-nowrap px-3 ${promoRedirectType === t ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      
                      {promoRedirectType === "CATEGORY" && (
                        <select 
                          value={newPromoItem.redirectUrl?.replace('/category/', '') || ''}
                          onChange={e => setNewPromoItem({...newPromoItem, redirectUrl: `/category/${e.target.value}`})}
                          className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-2.5 text-[10px] font-bold uppercase"
                        >
                          {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      )}
                      
                      {promoRedirectType === "PRODUCT" && (
                        <select 
                          value={newPromoItem.redirectUrl?.replace('/product/', '') || ''}
                          onChange={e => setNewPromoItem({...newPromoItem, redirectUrl: `/product/${e.target.value}`})}
                          className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-2.5 text-[10px] font-bold uppercase"
                        >
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      )}
                      
                      {promoRedirectType === "CUSTOM" && (
                        <input
                          type="text"
                          value={newPromoItem.redirectUrl}
                          onChange={(e) => setNewPromoItem({ ...newPromoItem, redirectUrl: e.target.value })}
                          placeholder="e.g. /search"
                          className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-2.5 text-[10px] font-bold"
                        />
                      )}
                    </div>

                    <button onClick={addPromoItem} className="w-full bg-zinc-200 text-zinc-900 py-3 rounded-xl font-black text-[9px] tracking-widest active:scale-95 transition-all mt-2 uppercase">
                      Add Item to Section ({newPromoSection.items.length} items so far)
                    </button>
                  </div>
                )}
              </div>

              {newPromoSection.items.length > 0 && (
                <div className="flex flex-col gap-2 py-2">
                  <label className="text-[9px] lg:text-[10px] font-black text-zinc-900 uppercase block">Configured Grid Items</label>
                  {newPromoSection.items.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-zinc-50 border border-zinc-200 p-2 rounded-xl relative group">
                      <div className="w-16 h-16 rounded-lg bg-zinc-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                        {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt="" /> : <span className="material-symbols-outlined text-zinc-400">image</span>}
                        <div className="absolute top-0 left-0 bg-black/60 text-white text-[8px] font-bold px-1 rounded-br-lg">{item.colSpan}x{item.rowSpan}</div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" value={item.imageUrl} onChange={e => {
                            const updated = [...newPromoSection.items];
                            updated[idx].imageUrl = e.target.value;
                            setNewPromoSection({...newPromoSection, items: updated});
                          }} className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-[10px] font-bold" placeholder="Image URL..." />
                          <input type="text" value={item.label || ""} onChange={e => {
                            const updated = [...newPromoSection.items];
                            updated[idx].label = e.target.value;
                            setNewPromoSection({...newPromoSection, items: updated});
                          }} className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-[10px] font-bold" placeholder="Label (Optional)..." />
                        </div>
                        <input type="text" value={item.redirectUrl} onChange={e => {
                          const updated = [...newPromoSection.items];
                          updated[idx].redirectUrl = e.target.value;
                          setNewPromoSection({...newPromoSection, items: updated});
                        }} className="w-full bg-white border border-zinc-200 rounded-lg p-2 text-[10px] font-bold" placeholder="Redirect URL (e.g. /category/id)..." />
                        <div className="flex gap-2">
                          <div className="flex-1 flex items-center gap-2 bg-white border border-zinc-200 rounded-lg p-1 px-2">
                            <span className="text-[8px] font-black text-zinc-400 uppercase">W</span>
                            <input type="number" min="1" max="4" value={item.colSpan} onChange={e => {
                              const updated = [...newPromoSection.items];
                              updated[idx].colSpan = parseInt(e.target.value) || 1;
                              setNewPromoSection({...newPromoSection, items: updated});
                            }} className="w-full bg-transparent border-none p-0 text-[10px] font-bold focus:ring-0" />
                          </div>
                          <div className="flex-1 flex items-center gap-2 bg-white border border-zinc-200 rounded-lg p-1 px-2">
                            <span className="text-[8px] font-black text-zinc-400 uppercase">H</span>
                            <input type="number" min="1" max="4" value={item.rowSpan} onChange={e => {
                              const updated = [...newPromoSection.items];
                              updated[idx].rowSpan = parseInt(e.target.value) || 1;
                              setNewPromoSection({...newPromoSection, items: updated});
                            }} className="w-full bg-transparent border-none p-0 text-[10px] font-bold focus:ring-0" />
                          </div>
                        </div>
                      </div>
                      <button onClick={() => removePromoItem(idx)} className="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg p-2 flex-shrink-0 transition-colors flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={addPromoSection} className="w-full bg-indigo-600 text-white py-3 lg:py-4 rounded-xl font-black text-[9px] lg:text-[10px] tracking-widest active:scale-95 transition-all shadow-lg shadow-indigo-500/10 uppercase mt-4">
                Save Promotional Section
              </button>
            </div>

            <div className="space-y-4">
              {(settings.promoSections || []).filter(s => s.type !== "deal_row" && s.type !== "sliding_row").map((s, idx) => (s.section === activeBannerTab || (!s.section && activeBannerTab === "BB")) ? (
                <div key={s.id} className="relative rounded-2xl overflow-hidden border border-zinc-200 shadow-sm p-4" style={{ backgroundColor: s.bgColor }}>
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <h4 className="font-headline font-black text-sm uppercase" style={{ color: s.textColor }}>{s.title || `${s.type} Section`}</h4>
                    <div className="flex items-center gap-2">
                      <button onClick={() => moveSection(s.id, 'up')} className="p-1.5 rounded-lg bg-black/10 text-inherit hover:bg-black/20 transition-colors">
                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                      </button>
                      <button onClick={() => moveSection(s.id, 'down')} className="p-1.5 rounded-lg bg-black/10 text-inherit hover:bg-black/20 transition-colors">
                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                      </button>
                      <button onClick={() => startEditSection(s)} className="p-1.5 rounded-lg bg-black/10 text-inherit hover:bg-black/20 transition-colors">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => removePromoSection(s.id)} className="bg-red-500/20 text-red-600 hover:bg-red-600 hover:text-white p-1.5 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto relative z-10">
                    {s.items.map((item, i) => (
                      <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-white/20 flex-shrink-0 bg-white/10">
                        <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null)}
              {(!settings.promoSections || settings.promoSections.filter(s => s.section === activeBannerTab && s.type !== "deal_row").length === 0) && (
                <div className="py-10 border-2 border-dashed border-zinc-100 rounded-3xl flex flex-col items-center justify-center opacity-40">
                   <span className="material-symbols-outlined text-4xl mb-2">view_carousel</span>
                   <p className="text-[10px] font-black tracking-widest uppercase">No other promotional sections added</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {isCropping && (
        <BannerCropper 
          aspect={cropAspect}
          onCropComplete={handleCroppedImage}
          onCancel={() => setIsCropping(false)}
        />
      )}
      </div>
    </>
  );
}
