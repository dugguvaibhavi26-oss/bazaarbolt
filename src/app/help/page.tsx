"use client";

import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BottomNav } from "@/components/BottomNav";

interface FAQ {
  q: string;
  a: string;
  order?: number;
}

export default function HelpPage() {
  const router = useRouter();
  const { cart } = useStore();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(collection(db, "faqs"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setFaqs(snap.docs.map(d => d.data() as FAQ));
      setLoading(false);
    }, (error) => {
      console.error("FAQ read error:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredFaqs = faqs.filter(f => 
    f.q.toLowerCase().includes(search.toLowerCase()) || 
    f.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="bg-white min-h-screen pb-44 uppercase">
      {/* Premium Header with Back Arrow Top Left */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-3xl pt-safe border-b border-zinc-100 uppercase">
        <div className="flex items-center px-4 py-5 w-full max-w-2xl mx-auto gap-4 uppercase">
          <button onClick={() => router.back()} className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors uppercase">
            <span className="material-symbols-outlined text-zinc-900 font-bold uppercase">arrow_back</span>
          </button>
          <div className="flex flex-col uppercase">
            <h1 className="text-xl font-headline font-black text-zinc-900 tracking-tighter leading-none uppercase">Help Center</h1>
            <span className="text-[10px] font-black text-zinc-400 tracking-widest mt-1 uppercase">Instant answers for you</span>
          </div>
        </div>
      </header>

      <div className="pt-28 px-4 max-w-2xl mx-auto uppercase">
        {/* Bolt Styled Search Bar */}
        <div className="mb-8 uppercase">
          <div className="bg-zinc-100 rounded-2xl flex items-center px-4 py-3 gap-3 border border-zinc-200 shadow-inner group focus-within:bg-white focus-within:border-primary transition-all uppercase">
            <span className="material-symbols-outlined text-zinc-400 text-lg uppercase">search</span>
            <input 
              type="text" 
              placeholder="Search for questions..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none p-0 font-bold text-xs focus:ring-0 placeholder:text-zinc-400 text-zinc-900 uppercase placeholder:uppercase"
            />
          </div>
        </div>

        <div className="space-y-6 uppercase">
          <h3 className="text-[10px] font-black text-zinc-400 tracking-widest uppercase mb-4 ml-1">Frequently Asked Questions</h3>
          
          {loading ? (
            <div className="space-y-4 uppercase">
               {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-zinc-50 rounded-3xl animate-pulse uppercase" />)}
            </div>
          ) : filteredFaqs.length === 0 ? (
             <div className="py-20 flex flex-col items-center justify-center opacity-30 uppercase">
                <span className="material-symbols-outlined text-6xl mb-4 uppercase">support_agent</span>
                <p className="font-headline font-black tracking-widest text-xs uppercase">No answers found yet</p>
             </div>
          ) : (
            <div className="space-y-3 uppercase">
              {filteredFaqs.map((faq, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm hover:border-primary transition-all group uppercase">
                  <h4 className="font-headline font-black text-sm text-zinc-900 mb-3 group-hover:text-green-600 transition-colors uppercase leading-tight">{faq.q}</h4>
                  <div className="h-[1px] w-8 bg-zinc-100 mb-3 group-hover:w-full group-hover:bg-primary/20 transition-all uppercase"></div>
                  <p className="text-zinc-500 text-xs font-bold leading-relaxed uppercase">{faq.a}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support Card */}
        <div className="mt-12 p-8 bg-zinc-950 rounded-[40px] text-center relative overflow-hidden shadow-2xl uppercase">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full pointer-events-none uppercase"></div>
          <span className="material-symbols-outlined text-4xl text-primary mb-4 block uppercase" style={{fontVariationSettings: "'FILL'1"}}>mail</span>
          <h3 className="text-white font-headline font-black text-lg tracking-tight mb-1 uppercase">Still need help?</h3>
          <p className="text-zinc-400 text-[10px] font-black tracking-widest mb-6 uppercase">Our team is active 24/7</p>
          <a href="mailto:support@bazaarbolt.shop" className="inline-block bg-white text-zinc-900 px-8 py-3.5 rounded-2xl font-black text-[10px] tracking-widest hover:bg-primary transition-all active:scale-95 uppercase">
            Support@BazaarBolt.Shop
          </a>
        </div>
      </div>

    </main>
  );
}
