"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

export default function SubscriptionsPage() {
 const router = useRouter();
 const [plans, setPlans] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 // Admins will create subscriptions in a 'subscriptions' collection.
 // They must have active: true.
 const q = query(collection(db, "subscriptions"), where("active", "==", true));
 const unsub = onSnapshot(q, (snapshot) => {
 const fetchedPlans: any[] = [];
 snapshot.forEach(doc => {
 fetchedPlans.push({ id: doc.id, ...doc.data() });
 });
 setPlans(fetchedPlans);
 setLoading(false);
 });

 return () => unsub();
 }, []);

 const handleSubscribe = (planId: string) => {
 const toastId = toast.loading("PROCESSING SUBSCRIPTION...");
 setTimeout(() => {
 toast.success("SUCCESSFULLY UPGRADED TO GOLD!", { id: toastId });
 router.push("/");
 }, 1500);
 }

 // Fallback default plans if no admin plans exist yet
 const displayPlans = plans.length > 0 ? plans : [
 {
 id: "mock_gold",
 name: "BazaarBolt Gold",
 price: 199,
 interval: "per month",
 description: "Unlimited Free Delivery • Extra Discounts on all categories • Priority Customer Support",
 benefits: ["Free delivery on orders above ₹99", "Exclusive 5% Extra discount", "Jump the queue priority"],
 color: "yellow",
 icon: "workspace_premium"
 },
 {
 id: "mock_plus",
 name: "BazaarBolt Plus",
 price: 99,
 interval: "per month",
 description: "Free deliveries on standard orders and zero surge fees during peak hours.",
 benefits: ["Free delivery on orders above ₹199", "No peak hour surge"],
 color: "blue",
 icon: "verified"
 }
 ];

 return (
 <main className="min-h-screen bg-surface pb-32 uppercase">
 {/* Header */}
 <header className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] border-b border-surface-variant/50 pt-safe uppercase">
 <div className="flex items-center px-4 py-4 w-full max-w-3xl mx-auto gap-4 uppercase">
 <button onClick={() => router.back()} className="p-2 hover:bg-zinc-100 rounded-full transition-colors uppercase">
 <span className="material-symbols-outlined text-zinc-900 uppercase">arrow_back</span>
 </button>
 <h1 className="text-xl font-headline font-black text-zinc-900 tracking-tight uppercase">Memberships</h1>
 </div>
 </header>

 {/* Hero */}
 <section className="bg-gradient-to-br from-zinc-900 to-black text-white px-6 py-12 text-center rounded-b-[40px] shadow-xl relative overflow-hidden mb-10 uppercase">
 <div className="absolute top-0 right-0 p-8 opacity-20 transform rotate-12 pointer-events-none uppercase">
 <span className="material-symbols-outlined text-9xl text-yellow-500 uppercase"style={{fontVariationSettings: "'FILL'1"}}>stars</span>
 </div>
 <div className="relative z-10 max-w-sm mx-auto uppercase">
 <span className="inline-block bg-primary text-zinc-900 font-extrabold text-[10px] tracking-widest px-3 py-1 rounded-full mb-6 uppercase">Upgrade Your Experience</span>
 <h2 className="text-4xl font-headline font-black tracking-tight leading-tight mb-4 uppercase">Never pay for delivery again.</h2>
 <p className="text-sm text-zinc-400 font-medium uppercase">Join our membership programs to unlock exclusive discounts and unlimited free slot deliveries.</p>
 </div>
 </section>

 {/* Subscription List */}
 <section className="px-5 max-w-3xl mx-auto uppercase">
 {loading ? (
 <div className="space-y-6">
 {[1,2].map(n => <div key={n} className="h-64 bg-zinc-100 rounded-3xl animate-pulse uppercase"/>)}
 </div>
 ) : (
 <div className="space-y-6 uppercase">
 {displayPlans.map((plan, idx) => {
 const isGold = plan.color === 'yellow'|| plan.name.toLowerCase().includes('gold') || idx === 0;
 return (
 <div key={plan.id} className={`p-1 rounded-3xl ${isGold ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600': 'bg-gradient-to-br from-blue-300 via-blue-500 to-blue-600'} shadow-lg transform transition-transform duration-300 hover:scale-[1.02] uppercase`}>
 <div className="bg-white rounded-[22px] p-6 h-full flex flex-col relative overflow-hidden uppercase">
 {/* Watermark Icon */}
 <span className={`material-symbols-outlined absolute -right-8 -top-8 text-[120px] pointer-events-none ${isGold ? 'text-yellow-50': 'text-blue-50'} uppercase`} style={{fontVariationSettings: "'FILL'1"}}>
 {plan.icon || 'workspace_premium'}
 </span>
 <div className="relative z-10 flex flex-col h-full uppercase">
 <div className="flex items-start justify-between mb-2">
 <div className="flex items-center gap-2 uppercase">
 <span className={`material-symbols-outlined ${isGold ? 'text-yellow-500': 'text-blue-500'} uppercase`} style={{fontVariationSettings: "'FILL'1"}}>
 {plan.icon || 'stars'}
 </span>
 <h3 className="font-headline font-black text-2xl text-zinc-900 tracking-tight uppercase">{plan.name}</h3>
 </div>
 </div>
 <div className="mb-6 uppercase">
 <div className="flex items-baseline gap-1 uppercase">
 <span className="text-3xl font-headline font-black text-zinc-900 tracking-tighter uppercase">₹{plan.price}</span>
 <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase">/{plan.interval || 'month'}</span>
 </div>
 </div>

 <p className="text-sm font-medium text-zinc-600 mb-6 bg-zinc-50 p-3 rounded-xl border border-zinc-100 uppercase">{plan.description}</p>
 <div className="space-y-3 mb-8 flex-grow uppercase">
 {plan.benefits?.map((benefit: string, bIdx: number) => (
 <div key={bIdx} className="flex items-start gap-3 uppercase">
 <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${isGold ? 'bg-yellow-100 text-yellow-600': 'bg-blue-100 text-blue-600'} uppercase`}>
 <span className="material-symbols-outlined text-[10px] uppercase"style={{fontVariationSettings: "'FILL'1"}}>check</span>
 </div>
 <span className="text-sm font-bold text-zinc-700 leading-snug uppercase">{benefit}</span>
 </div>
 ))}
 </div>

 <button onClick={() => handleSubscribe(plan.id)} className={`w-full py-4 rounded-2xl font-black tracking-widest text-sm transition-all active:scale-95 shadow-md uppercase ${isGold ? 'bg-zinc-900 hover:bg-black text-white': 'bg-blue-100 hover:bg-blue-200 text-blue-900'}`}>
 Get {plan.name}
 </button>
 </div>
 </div>
 </div>
 )
 })}
 </div>
 )}
 </section>
 </main>
 );
}
