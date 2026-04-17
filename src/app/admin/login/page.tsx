"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, role } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Verifying Admin Credentials...");
    try {
      await signIn(email, password);
      // Auth provider will update role. We can check locally after a short delay or just depend on layout redirect.
      toast.success("Identity Verified. Welcome back.", { id: toastId });
      router.push("/admin");
    } catch (error: any) {
      toast.error("Access Denied: " + error.message, { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
       {/* Background Decoration */}
       <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary rounded-full filter blur-[100px]"></div>
          <div className="absolute bottom-[0%] left-[-5%] w-80 h-80 bg-blue-600 rounded-full filter blur-[100px]"></div>
       </div>

       <div className="w-full max-w-lg bg-zinc-900/50 backdrop-blur-3xl p-12 rounded-[48px] border border-white/10 shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-12">
             <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-primary/20 rotate-12">
                <span className="material-symbols-outlined text-zinc-900 font-black text-3xl">bolt</span>
             </div>
             <h1 className="text-3xl font-headline font-black text-white italic tracking-tight uppercase">Security Vault</h1>
             <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-2">BazaarBolt Admin Infrastructure</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
             <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 mb-2 block">Personnel Identifier (Email)</label>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-white font-bold text-sm focus:ring-2 ring-primary transition-all outline-none"
                  placeholder="admin@bazaarbolt.rapid"
                />
             </div>
             <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 mb-2 block">Security Token (Password)</label>
                <input 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl p-5 text-white font-bold text-sm focus:ring-2 ring-primary transition-all outline-none"
                  placeholder="••••••••"
                />
             </div>

             <div className="pt-4">
                <button type="submit" className="w-full bg-primary hover:bg-white text-zinc-900 h-16 rounded-2xl font-headline font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary/10 active:scale-95">
                   Initiate System Access
                </button>
             </div>
             
             <div className="flex items-center justify-center gap-2 pt-6 opacity-30 text-white">
                <span className="material-symbols-outlined text-sm">lock</span>
                <span className="text-[9px] font-black uppercase tracking-widest">RSA 2048-BIT ENCRYPTION</span>
             </div>
          </form>
       </div>
    </div>
  );
}
