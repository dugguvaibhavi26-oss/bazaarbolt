"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useStore } from "@/store/useStore";
import toast from "react-hot-toast";

export default function AdminNotifications() {
 const { user } = useAuth();
  const { categories, products } = useStore();
  const [loading, setLoading] = useState(false);
  const [redirectType, setRedirectType] = useState<"NONE" | "CATEGORY" | "PRODUCT" | "CUSTOM">("NONE");
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    target: "ALL" as "ALL" | "CUSTOMERS" | "RIDERS",
    url: "",
  });

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
    <div className="space-y-8 pb-32">
      <div>
        <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Push Communications</h3>
        <p className="text-xs font-bold text-zinc-400 tracking-widest mt-1">Send real-time alerts to users</p>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-zinc-100 p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-2 block">Target Audience</label>
              <div className="flex bg-zinc-50 p-1.5 rounded-2xl gap-2">
                {(["ALL", "CUSTOMERS", "RIDERS"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...formData, target: t })}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${
                      formData.target === t ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-2 block">Notification Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Announcement"
                className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-2 block">Message Content</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Check out our new products!"
                rows={4}
                className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all resize-none"
                required
              />
            </div>
            
            <div className="pt-4 border-t border-zinc-100">
              <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-2 block">Redirection (On Click)</label>
              <div className="flex bg-zinc-50 p-1.5 rounded-2xl gap-2 mb-3">
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
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all ${
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
                  className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all"
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              )}
              
              {redirectType === "PRODUCT" && (
                <select 
                  value={formData.url.replace('/product/', '')}
                  onChange={e => setFormData({...formData, url: `/product/${e.target.value}`})}
                  className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all"
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
                  className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all"
                />
              )}
            </div>
          </div>

 <button
 type="submit"
 disabled={loading}
 className="w-full bg-zinc-900 text-white py-5 rounded-3xl font-black tracking-widest text-[10px] transition-all hover:bg-black shadow-xl shadow-zinc-900/10 flex items-center justify-center gap-2"
 >
 {loading ? (
 <>
 <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
 Sending...
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

 {/* Examples section for Admin help */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
 <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
 <p className="text-[10px] font-black text-blue-600 mb-2">Pro Tip</p>
 <p className="text-xs font-bold text-blue-900 leading-relaxed">Broadcast messages sent to 'ALL'or 'CUSTOMERS'will reach users even if they don't have the app open via FCM topics.</p>
 </div>
 </div>
 </div>
 );
}
