"use client";

import { useAuth } from "@/components/AuthProvider";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

export default function RiderAccountPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    aadharId: ""
  });

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            aadharId: data.aadharId || ""
          });
        }
      } catch (err) {
        toast.error("Error loading profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), profile);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="space-y-6 pt-10">
      <div className="h-64 bg-white rounded-[40px] animate-pulse" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="px-2">
        <h2 className="text-3xl font-headline font-black text-zinc-900 tracking-tight italic">Rider Profile</h2>
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">MANAGE YOUR CREDENTIALS</p>
      </div>

      <form onSubmit={handleUpdate} className="bg-white rounded-[40px] p-8 shadow-sm border border-zinc-100 space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
             <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Full Name</label>
             <input 
               type="text" 
               className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-headline font-bold text-zinc-900 focus:ring-2 focus:ring-primary transition-all"
               value={profile.name}
               onChange={e => setProfile({...profile, name: e.target.value})}
               disabled={saving}
               placeholder="Enter your name"
             />
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Email Address</label>
             <input 
               type="email" 
               className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-headline font-bold text-zinc-900 focus:ring-2 focus:ring-primary transition-all opacity-50 cursor-not-allowed"
               value={profile.email}
               readOnly
               placeholder="Email cannot be changed"
             />
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Phone Number</label>
             <input 
               type="tel" 
               className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-headline font-bold text-zinc-900 focus:ring-2 focus:ring-primary transition-all"
               value={profile.phone}
               onChange={e => setProfile({...profile, phone: e.target.value})}
               disabled={saving}
               placeholder="Enter phone number"
             />
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Home Address</label>
             <textarea 
               className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-headline font-bold text-zinc-900 focus:ring-2 focus:ring-primary transition-all min-h-[100px]"
               value={profile.address}
               onChange={e => setProfile({...profile, address: e.target.value})}
               disabled={saving}
               placeholder="Detailed address"
             />
          </div>

          <div className="space-y-2">
             <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Aadhar ID Number</label>
             <input 
               type="text" 
               className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-headline font-bold text-zinc-900 focus:ring-2 focus:ring-primary transition-all"
               value={profile.aadharId}
               onChange={e => setProfile({...profile, aadharId: e.target.value})}
               disabled={saving}
               placeholder="12-digit Aadhar number"
             />
          </div>
        </div>

        <button 
          type="submit"
          disabled={saving}
          className="w-full h-16 bg-zinc-900 text-white rounded-2xl font-headline font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-zinc-900/10 disabled:opacity-50"
        >
          {saving ? "SAVING..." : "Save Changes"}
          <span className="material-symbols-outlined text-lg">check_circle</span>
        </button>
      </form>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Policy & Legal</h3>
        <button 
          onClick={() => window.open("https://bazaarbolt.com/privacy-policy", "_blank")}
          className="w-full h-16 bg-white border border-zinc-100 rounded-2xl px-6 flex items-center justify-between group hover:border-blue-500 transition-all shadow-sm"
        >
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-zinc-400 group-hover:text-blue-500 transition-colors">description</span>
            <span className="font-headline font-black text-xs text-zinc-900 uppercase tracking-widest">Privacy Policy</span>
          </div>
          <span className="material-symbols-outlined text-zinc-300 group-hover:translate-x-1 transition-transform">open_in_new</span>
        </button>
      </div>
    </div>
  );
}
