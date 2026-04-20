"use client";

import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function EditProfilePage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: ""
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    if (userData) {
      setFormData({
        name: userData.name || user?.displayName || "",
        phoneNumber: userData.phoneNumber || ""
      });
    }
  }, [user, userData, loading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.name) return toast.error("NAME IS REQUIRED");

    setSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        name: formData.name,
        phoneNumber: formData.phoneNumber
      }, { merge: true });
      toast.success("PROFILE UPDATED!");
      router.back();
    } catch (err: any) {
      console.error("Profile update error:", err);
      toast.error(err.message?.toUpperCase() || "FAILED TO UPDATE PROFILE");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return null;

  return (
    <main className="min-h-screen bg-zinc-50 pb-32">
      <header className="sticky top-0 w-full z-50 bg-white shadow-sm border-b border-zinc-100 pt-safe">
        <div className="flex items-center px-4 py-4 w-full max-w-3xl mx-auto gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <span className="material-symbols-outlined text-zinc-900">arrow_back</span>
          </button>
          <h1 className="text-xl font-headline font-black text-zinc-900 tracking-tight uppercase">Edit Profile</h1>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-6 pt-10">
        <form onSubmit={handleSave} className="bg-white rounded-[40px] p-8 shadow-sm border border-zinc-100 space-y-6">
          <div className="space-y-1.5 uppercase">
            <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 uppercase">Email Address (Fixed)</label>
            <input 
              type="text" 
              value={user.email || ""} 
              disabled 
              className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-xs text-zinc-400 cursor-not-allowed uppercase"
            />
          </div>

          <div className="space-y-1.5 uppercase">
            <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 uppercase">Full Name</label>
            <input 
              type="text" 
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-4 ring-primary/20 transition-all uppercase placeholder:uppercase"
            />
          </div>

          <div className="space-y-1.5 uppercase">
            <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 uppercase">Phone Number</label>
            <input 
              type="tel" 
              placeholder="+91 00000 00000"
              value={formData.phoneNumber}
              onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-4 ring-primary/20 transition-all uppercase"
            />
          </div>

          <button 
            type="submit"
            disabled={saving}
            className="w-full bg-zinc-900 text-white py-5 rounded-3xl font-headline font-black tracking-widest text-xs hover:bg-black transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-zinc-200 uppercase"
          >
            {saving ? 'Saving...' : 'Propagate Changes'}
          </button>
        </form>
      </div>
    </main>
  );
}
