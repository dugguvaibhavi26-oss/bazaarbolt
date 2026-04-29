"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useStore } from "@/store/useStore";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { mapSettings } from "@/lib/mappers";
import { AppSettings } from "@/types";
import toast from "react-hot-toast";
import Link from "next/link";

export default function AdminNotifications() {
  const { user } = useAuth();
  const { categories, products } = useStore();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [redirectType, setRedirectType] = useState<"NONE" | "CATEGORY" | "PRODUCT" | "CUSTOM">("NONE");
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    target: "ALL" as "ALL" | "CUSTOMERS" | "RIDERS",
    url: "",
  });

  const [activeTab, setActiveTab] = useState<"BROADCAST" | "AUTOMATED">("BROADCAST");
  const [templateContext, setTemplateContext] = useState<"GLOBAL" | "BB" | "CAFE">("GLOBAL");
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "config"), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(mapSettings(docSnap));
      }
    });
    return () => unsub();
  }, []);

  const handleSaveTemplate = async () => {
    if (!settings) return;
    setSavingTemplate(true);
    const toastId = toast.loading("Saving templates...");
    try {
      await setDoc(doc(db, "settings", "config"), settings, { merge: true });
      toast.success("Templates updated successfully!", { id: toastId });
    } catch (err) {
      toast.error("Failed to save templates", { id: toastId });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Sending notifications...");

    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error("Authentication required");

      const response = await fetch("/api/admin/send-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Notifications sent successfully!", { id: toastId });
        setFormData({ title: "", message: "", target: "ALL", url: "" });
        setRedirectType("NONE");
      } else {
        toast.error(result.error || "Failed to send", { id: toastId });
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 pb-32">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl lg:text-2xl font-black text-zinc-900 tracking-tight">Push Communications</h3>
          <p className="text-[10px] lg:text-xs font-bold text-zinc-400 tracking-widest mt-1 uppercase">Manage broadcasts and automated alerts</p>
        </div>
        <div className="flex bg-zinc-100 p-1 rounded-2xl w-full lg:w-auto">
          <button 
            onClick={() => setActiveTab("BROADCAST")}
            className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all ${activeTab === "BROADCAST" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
          >
            Broadcast
          </button>
          <button 
            onClick={() => setActiveTab("AUTOMATED")}
            className={`flex-1 lg:flex-none px-6 py-2.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all ${activeTab === "AUTOMATED" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
          >
            Automated Templates
          </button>
        </div>
      </div>

      {activeTab === "BROADCAST" ? (
        <div className="bg-white rounded-[32px] lg:rounded-[40px] shadow-sm border border-zinc-100 p-6 lg:p-8 max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4 lg:space-y-5">
              <div>
                <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-1.5 lg:mb-2 block uppercase">Target Audience</label>
                <div className="flex bg-zinc-50 p-1 lg:p-1.5 rounded-xl lg:rounded-2xl gap-1 lg:gap-2 overflow-x-auto hide-scrollbar">
                  {(["ALL", "CUSTOMERS", "RIDERS"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({ ...formData, target: t })}
                      className={`flex-1 py-2.5 lg:py-3 px-4 rounded-lg lg:rounded-xl text-[8px] lg:text-[10px] font-black tracking-widest transition-all whitespace-nowrap ${
                        formData.target === t ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-1.5 lg:mb-2 block uppercase">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Announcement"
                  className="w-full bg-zinc-50 border-none rounded-xl lg:rounded-2xl p-4 lg:p-5 font-bold text-xs lg:text-sm focus:ring-2 ring-primary transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-1.5 lg:mb-2 block uppercase">Message Content</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Check out our new products!"
                  rows={4}
                  className="w-full bg-zinc-50 border-none rounded-xl lg:rounded-2xl p-4 lg:p-5 font-bold text-xs lg:text-sm focus:ring-2 ring-primary transition-all resize-none"
                  required
                />
              </div>
              
              <div className="pt-4 lg:pt-6 border-t border-zinc-100">
                <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-1.5 lg:mb-2 block uppercase">Redirection (On Click)</label>
                <div className="flex bg-zinc-50 p-1 lg:p-1.5 rounded-xl lg:rounded-2xl gap-1 lg:gap-2 mb-3 overflow-x-auto hide-scrollbar">
                  {(["NONE", "CATEGORY", "PRODUCT", "CUSTOM"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setRedirectType(t);
                        if (t === "NONE") setFormData(prev => ({...prev, url: ""}));
                        else if (t === "CATEGORY" && categories.length > 0) setFormData(prev => ({...prev, url: `/category/${categories[0].id}`}));
                        else if (t === "PRODUCT" && products.length > 0) setFormData(prev => ({...prev, url: `/product/${products[0].id}`}));
                        else if (t === "CUSTOM") setFormData(prev => ({...prev, url: "/orders"}));
                      }}
                      className={`flex-1 py-2.5 lg:py-3 px-3 rounded-lg lg:rounded-xl text-[8px] lg:text-[10px] font-black tracking-widest transition-all whitespace-nowrap ${
                        redirectType === t ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                
                {redirectType === "CATEGORY" && (
                  <select 
                    value={formData.url.replace('/category/', '')}
                    onChange={e => setFormData({...formData, url: `/category/${e.target.value}`})}
                    className="w-full bg-zinc-50 border-none rounded-xl lg:rounded-2xl p-4 lg:p-5 font-bold text-[10px] lg:text-sm focus:ring-2 ring-primary transition-all uppercase"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                )}
                
                {redirectType === "PRODUCT" && (
                  <select 
                    value={formData.url.replace('/product/', '')}
                    onChange={e => setFormData({...formData, url: `/product/${e.target.value}`})}
                    className="w-full bg-zinc-50 border-none rounded-xl lg:rounded-2xl p-4 lg:p-5 font-bold text-[10px] lg:text-sm focus:ring-2 ring-primary transition-all uppercase"
                  >
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                
                {redirectType === "CUSTOM" && (
                  <input
                    type="text"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="e.g. /orders or /search"
                    className="w-full bg-zinc-50 border-none rounded-xl lg:rounded-2xl p-4 lg:p-5 font-bold text-[10px] lg:text-sm focus:ring-2 ring-primary transition-all"
                  />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white h-14 lg:h-16 rounded-2xl lg:rounded-3xl font-black tracking-widest text-[9px] lg:text-[10px] transition-all hover:bg-black shadow-xl shadow-zinc-900/10 flex items-center justify-center gap-2 uppercase"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  Dispatching...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  Dispatch Notification
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 lg:p-8 rounded-[32px] border border-zinc-100">
            <div>
              <h4 className="font-headline font-black text-lg text-zinc-900 tracking-tight">Automated Templates</h4>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Editing context: {templateContext}</p>
            </div>
            <div className="flex bg-zinc-100 p-1 rounded-xl">
              {(["GLOBAL", "BB", "CAFE"] as const).map(c => (
                <button 
                  key={c}
                  onClick={() => setTemplateContext(c)}
                  className={`px-4 py-1.5 rounded-lg text-[8px] font-black tracking-widest uppercase transition-all ${templateContext === c ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {settings && (["PLACED", "ACCEPTED", "PICKED", "DELIVERED", "CANCELLED"] as const).map((status) => {
              const templates = templateContext === "GLOBAL" 
                ? settings.notificationTemplates 
                : (settings.sectionSettings?.[templateContext as "BB"|"CAFE"]?.notificationTemplates || settings.notificationTemplates);
              
              const template = templates?.[status] || { title: "", body: "" };

              const handleTemplateChange = (key: 'title' | 'body', val: string) => {
                if (!settings) return;
                if (templateContext === "GLOBAL") {
                  setSettings({
                    ...settings,
                    notificationTemplates: {
                      ...settings.notificationTemplates,
                      [status]: { ...template, [key]: val }
                    }
                  });
                } else {
                  const currentSec = settings.sectionSettings?.[templateContext as "BB"|"CAFE"] || {};
                  const currentNotifs = currentSec.notificationTemplates || settings.notificationTemplates || {};
                  setSettings({
                    ...settings,
                    sectionSettings: {
                      ...settings.sectionSettings,
                      [templateContext as "BB"|"CAFE"]: {
                        ...currentSec,
                        notificationTemplates: {
                          ...currentNotifs,
                          [status]: { ...template, [key]: val }
                        }
                      }
                    }
                  });
                }
              };

              return (
                <div key={status} className={`p-6 lg:p-8 rounded-[32px] border transition-all space-y-4 ${templateContext !== 'GLOBAL' ? 'bg-primary/5 border-primary/20' : 'bg-white border-zinc-100'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-primary tracking-widest uppercase">{status} Alert</span>
                    <span className="material-symbols-outlined text-zinc-300 text-lg">smart_button</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[8px] font-black text-zinc-400 uppercase ml-1 mb-1 block">Notification Title</label>
                      <input 
                        type="text" 
                        value={template.title}
                        onChange={e => handleTemplateChange('title', e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-4 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-zinc-400 uppercase ml-1 mb-1 block">Message Body</label>
                      <textarea 
                        rows={3}
                        value={template.body}
                        onChange={e => handleTemplateChange('body', e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-xl p-4 text-xs font-bold resize-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button 
            onClick={handleSaveTemplate}
            disabled={savingTemplate}
            className="fixed bottom-24 right-6 lg:right-12 bg-zinc-900 text-white px-8 py-4 rounded-full font-black text-[10px] tracking-widest shadow-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all uppercase z-50"
          >
            {savingTemplate ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined">save_as</span>
            )}
            {savingTemplate ? 'Applying Changes...' : 'Propagate Templates'}
          </button>
        </div>
      )}
    </div>
  );
}
