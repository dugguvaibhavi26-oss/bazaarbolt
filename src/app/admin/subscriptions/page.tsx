"use client";

import { useStore } from "@/store/useStore";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function AdminSubscriptions() {
 const [plans, setPlans] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 const unsub = onSnapshot(collection(db, "subscriptions"), (snapshot) => {
 const fetchedPlans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
 setPlans(fetchedPlans);
 setLoading(false);
 });
 return () => unsub();
 }, []);

 const toggleStatus = async (plan: any) => {
 try {
 await setDoc(doc(db, "subscriptions", plan.id), { ...plan, active: !plan.active });
 toast.success("Membership status updated");
 } catch (e) {
 toast.error("Failed to update status");
 }
 };

 const defaultPlans = [
 { id: "gold", name: "BazaarBolt Gold", price: 199, active: true, color: "yellow"},
 { id: "plus", name: "BazaarBolt Plus", price: 99, active: true, color: "blue"}
 ];

 const currentPlans = plans.length > 0 ? plans : defaultPlans;

 return (
 <div className="space-y-8">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Memberships & Plans</h3>
 <p className="text-xs font-bold text-zinc-400 tracking-widest mt-1">Configure premium tiers and pricing</p>
 </div>
 <button onClick={() => toast("Feature coming soon: Plan Creator")} className="bg-zinc-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] tracking-widest flex items-center gap-2 hover:bg-black shadow-lg">
 <span className="material-symbols-outlined text-sm">add</span>
 Create Plan
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {currentPlans.map((plan) => {
 const isGold = plan.name.toLowerCase().includes('gold') || plan.color === 'yellow';
 return (
 <div key={plan.id} className={`p-1 rounded-[40px] ${isGold ? 'bg-gradient-to-br from-yellow-100 to-yellow-500': 'bg-gradient-to-br from-blue-100 to-blue-500'} shadow-lg`}>
 <div className="bg-white rounded-[39px] p-8 h-full relative overflow-hidden">
 <div className="absolute top-0 right-0 p-8 opacity-5">
 <span className="material-symbols-outlined text-[100px]">{isGold ? 'workspace_premium': 'verified'}</span>
 </div>
 <div className="flex justify-between items-start mb-8 relative z-10">
 <div>
 <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-widest mb-3 ${isGold ? 'bg-yellow-100 text-yellow-700': 'bg-blue-100 text-blue-700'}`}>
 {plan.id.toUpperCase()} PLAN
 </span>
 <h4 className="text-3xl font-headline font-black text-zinc-900 tracking-tighter">{plan.name}</h4>
 </div>
 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isGold ? 'bg-yellow-50 text-yellow-600': 'bg-blue-50 text-blue-600'}`}>
 <span className="material-symbols-outlined font-bold"style={{fontVariationSettings: "'FILL'1"}}>
 {isGold ? 'workspace_premium': 'verified'}
 </span>
 </div>
 </div>

 <div className="mb-8">
 <div className="flex items-baseline gap-1">
 <span className="text-4xl font-headline font-black text-zinc-900 tracking-tighter">₹{plan.price}</span>
 <span className="text-[10px] font-black text-zinc-400 tracking-widest">/ Month</span>
 </div>
 </div>

 <div className="space-y-4 mb-10 text-zinc-500 font-bold text-sm">
 <div className="flex items-center gap-3">
 <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
 <span>Unlimited Free Delivery</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
 <span>Priority Logistics</span>
 </div>
 <div className="flex items-center gap-3">
 <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
 <span>Surge Fee Waiver</span>
 </div>
 </div>

 <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
 <div className="flex items-center gap-2">
 <span className={`w-2 h-2 rounded-full ${plan.active ? 'bg-green-500': 'bg-red-500'}`}></span>
 <span className="text-[10px] font-black tracking-widest text-zinc-400">{plan.active ? 'Visible To Users': 'Hidden'}</span>
 </div>
 <div className="flex gap-2">
 <button className="p-3 bg-zinc-50 text-zinc-400 hover:text-zinc-900 rounded-xl transition-all"><span className="material-symbols-outlined text-sm">edit</span></button>
 <button onClick={() => toggleStatus(plan)}
 className={`px-5 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all ${plan.active ? 'bg-red-50 text-red-600': 'bg-green-50 text-green-600'}`}
 >
 {plan.active ? 'Deactivate': 'Activate'}
 </button>
 </div>
 </div>
 </div>
 </div>
 )
 })}
 </div>
 </div>
 );
}
