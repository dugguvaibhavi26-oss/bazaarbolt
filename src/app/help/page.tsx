"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

export default function HelpPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "faqs"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setFaqs(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 pb-32">
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-2xl shadow-sm pt-safe">
        <div className="flex items-center px-4 py-4 w-full max-w-3xl mx-auto gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <span className="material-symbols-outlined text-zinc-900 font-bold">arrow_back</span>
          </button>
          <h1 className="text-xl font-headline font-black text-zinc-900 tracking-tight leading-none italic-remove">Help center</h1>
        </div>
      </header>

      <div className="pt-24 px-5 max-w-3xl mx-auto">
        <div className="bg-zinc-900 rounded-[32px] p-8 text-white mb-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-bl-[100px] pointer-events-none"></div>
          <h2 className="text-3xl font-headline font-black mb-6 tracking-tight italic-remove">How can we help?</h2>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">search</span>
            <input 
              type="text" 
              placeholder="Search for issues..." 
              className="w-full bg-white/10 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-zinc-500 focus:ring-2 ring-primary/50 transition-all outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <button onClick={() => toast.success("Connecting to chat...")} className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL'1"}}>chat</span>
            </div>
            <span className="font-headline font-black text-xs tracking-widest text-zinc-900">Live chat</span>
          </button>
          <button onClick={() => window.open('tel:1800-BOLT-HELP')} className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm flex flex-col items-center gap-3 active:scale-95 transition-all">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL'1"}}>call</span>
            </div>
            <span className="font-headline font-black text-xs tracking-widest text-zinc-900">Call us</span>
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="font-headline font-black text-sm text-zinc-400 tracking-widest ml-2 mb-4">Common questions</h3>
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-3xl animate-pulse" />)
          ) : faqs.length === 0 ? (
             <p className="text-center text-zinc-400 text-xs py-10">No FAQs found.</p>
          ) : (
            faqs.filter(f => f.q.toLowerCase().includes(search.toLowerCase())).map((faq, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm group">
                <h4 className="font-headline font-black text-zinc-900 mb-3 group-hover:text-primary transition-colors">{faq.q}</h4>
                <p className="text-zinc-500 text-sm font-medium leading-relaxed">{faq.a}</p>
              </div>
            ))
          )}
        </div>
        <div className="mt-12 text-center p-8 bg-zinc-100 rounded-[40px] border border-dashed border-zinc-300">
          <span className="material-symbols-outlined text-4xl text-zinc-300 mb-3" style={{fontVariationSettings: "'FILL'1"}}>mail</span>
          <p className="text-zinc-500 font-bold text-sm italic-remove">Still need help?</p>
          <p className="text-zinc-400 text-xs mt-1">support@bazaarbolt.rapid</p>
        </div>
      </div>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] z-50 bg-white/95 backdrop-blur-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] border border-white/40 rounded-full px-6 py-3 flex justify-between items-center transition-all">
        <button onClick={() => router.push("/")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-all">
          <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">home</span>
          <span className="font-headline text-[9px] font-black tracking-widest mt-1 text-zinc-400 group-hover:text-zinc-900">Home</span>
        </button>
        <button onClick={() => router.push("/frequently-bought")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-all">
          <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">history</span>
          <span className="font-headline text-[9px] font-black tracking-widest mt-1 text-zinc-400 group-hover:text-zinc-900">Order again</span>
        </button>
        <button onClick={() => {}} className="flex flex-col items-center justify-center text-zinc-900 group active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform" style={{fontVariationSettings: "'FILL'1"}}>support_agent</span>
          <span className="font-headline text-[9px] font-black tracking-widest mt-1 text-zinc-900">Support</span>
        </button>
        <button onClick={() => router.push("/cart")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-transform relative">
          <div className="relative">
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">shopping_bag</span>
          </div>
          <span className="font-headline text-[9px] font-black tracking-widest mt-1 text-zinc-400 group-hover:text-zinc-900">Cart</span>
        </button>
      </nav>
    </main>
  );
}
