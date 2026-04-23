"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AdminLoginPage() {
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const { role } = useAuth();
 const router = useRouter();

 const handleLogin = async (e: React.FormEvent) => {
 e.preventDefault();
 const toastId = toast.loading("Verifying Admin Credentials...");
 try {
 await signInWithEmailAndPassword(auth, email, password);
 // Auth provider will update role. We can check locally after a short delay or just depend on layout redirect.
 toast.success("Identity Verified. Welcome back.", { id: toastId });
 router.push("/admin");
 } catch (error: any) {
 toast.error("Access Denied: "+ error.message, { id: toastId });
 }
 };


 return (
  <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 lg:p-6 relative overflow-hidden">
 {/* Background Decoration */}
 <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
 <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary rounded-full filter blur-[100px]"></div>
 <div className="absolute bottom-[0%] left-[-5%] w-80 h-80 bg-blue-600 rounded-full filter blur-[100px]"></div>
 </div>

   <div className="w-full max-w-lg bg-zinc-900/50 backdrop-blur-3xl p-8 lg:p-12 rounded-[40px] lg:rounded-[48px] border border-white/10 shadow-2xl relative z-10">
    <div className="flex flex-col items-center mb-8 lg:mb-12">
     <div className="w-14 h-14 lg:w-16 lg:h-16 bg-primary rounded-xl lg:rounded-2xl flex items-center justify-center mb-5 lg:mb-6 shadow-xl shadow-primary/20 rotate-12">
      <span className="material-symbols-outlined text-zinc-900 font-black text-2xl lg:text-3xl">bolt</span>
     </div>
     <h1 className="text-2xl lg:text-3xl font-headline font-black text-white tracking-tight uppercase">Security Vault</h1>
     <p className="text-[9px] lg:text-[10px] font-black text-zinc-500 tracking-[0.3em] mt-2 uppercase">BazaarBolt Infrastructure</p>
    </div>

    <form onSubmit={handleLogin} className="space-y-5 lg:space-y-6">
     <div>
      <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-500 ml-1 mb-1.5 lg:mb-2 block uppercase">Personnel ID (Email)</label>
      <input type="email" required value={email}
       onChange={(e) => setEmail(e.target.value)}
       className="w-full bg-white/5 border border-white/5 rounded-xl lg:rounded-2xl p-4 lg:p-5 text-white font-bold text-xs lg:text-sm focus:ring-2 ring-primary transition-all outline-none"
       placeholder="admin@bazaarbolt.rapid"
      />
     </div>
     <div>
      <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-500 ml-1 mb-1.5 lg:mb-2 block uppercase">Security Token (Pass)</label>
      <input type="password" required value={password}
       onChange={(e) => setPassword(e.target.value)}
       className="w-full bg-white/5 border border-white/5 rounded-xl lg:rounded-2xl p-4 lg:p-5 text-white font-bold text-xs lg:text-sm focus:ring-2 ring-primary transition-all outline-none"
       placeholder="••••••••"
      />
     </div>

     <div className="pt-2 lg:pt-4">
      <button type="submit" className="w-full bg-primary hover:bg-white text-zinc-900 h-14 lg:h-16 rounded-xl lg:rounded-2xl font-headline font-black text-[10px] lg:text-xs tracking-widest transition-all shadow-xl shadow-primary/10 active:scale-95 uppercase">
       Initiate System Access
      </button>
     </div>
 <div className="flex items-center justify-center gap-2 pt-6 opacity-30 text-white">
 <span className="material-symbols-outlined text-sm">lock</span>
 <span className="text-[9px] font-black tracking-widest">RSA 2048-BIT ENCRYPTION</span>
 </div>
 </form>
 </div>
 </div>
 );
}
