"use client";

import { useStore } from "@/store/useStore";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function AdminCoupons() {
 const [coupons, setCoupons] = useState<any[]>([]);
 const [isAdding, setIsAdding] = useState(false);
 const [newCoupon, setNewCoupon] = useState({ code: "", discount: 0, active: true });

 useEffect(() => {
 const unsub = onSnapshot(collection(db, "coupons"), (snapshot) => {
 const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
 setCoupons(fetched);
 });
 return () => unsub();
 }, []);

 const handleAddCoupon = async () => {
 if (!newCoupon.code || newCoupon.discount <= 0) {
 toast.error("Please enter valid code and discount");
 return;
 }
 try {
 await setDoc(doc(db, "coupons", newCoupon.code), newCoupon);
 toast.success("Coupon added successfully");
 setNewCoupon({ code: "", discount: 0, active: true });
 setIsAdding(false);
 } catch (e) {
 toast.error("Error adding coupon");
 }
 };

 const deleteCoupon = async (id: string) => {
 try {
 await deleteDoc(doc(db, "coupons", id));
 toast.success("Coupon deleted");
 } catch (e) {
 toast.error("Error deleting coupon");
 }
 };

 return (
 <div className="space-y-6 lg:space-y-8">
  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
   <div>
    <h3 className="text-xl lg:text-2xl font-black text-zinc-900 tracking-tight">Promos & Coupons</h3>
    <p className="text-[10px] lg:text-xs font-bold text-zinc-400 tracking-widest mt-1 uppercase">Drive growth with strategic discounts</p>
   </div>
   <button onClick={() => setIsAdding(true)} className="w-full lg:w-auto bg-zinc-900 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-2xl font-black text-[9px] lg:text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-black shadow-lg">
    <span className="material-symbols-outlined text-sm">add</span>
    Add Coupon
   </button>
  </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {coupons.map((cp) => (
 <div key={cp.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-zinc-200 relative overflow-hidden group hover:border-primary/30 transition-all">
 <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
 <span className="material-symbols-outlined text-[60px]">local_activity</span>
 </div>
 <div className="flex items-center gap-4 mb-6">
 <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
 <span className="material-symbols-outlined font-bold">confirmation_number</span>
 </div>
 <div>
 <h4 className="font-headline font-black text-xl text-zinc-900 tracking-tight leading-none">{cp.code}</h4>
 <div className="flex items-center gap-2 mt-2">
 <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded tracking-widest">{cp.discount}% OFF</span>
 <span className={`w-1.5 h-1.5 rounded-full ${cp.active ? 'bg-green-500': 'bg-red-500'}`}></span>
 </div>
 </div>
 </div>

 <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
 <div className="flex flex-col">
 <span className="text-[9px] font-black text-zinc-400 tracking-widest">Type</span>
 <span className="text-xs font-bold text-zinc-700">Percentage Discount</span>
 </div>
 <button onClick={() => deleteCoupon(cp.id)} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center group">
 <span className="material-symbols-outlined text-[18px] font-bold group-hover:scale-110 transition-transform">delete</span>
 </button>
 </div>
 </div>
 ))}
 {coupons.length === 0 && (
 <div className="col-span-full py-20 bg-zinc-100 rounded-[40px] border border-dashed border-zinc-300 flex flex-col items-center">
 <span className="material-symbols-outlined text-5xl text-zinc-300 mb-4">local_activity</span>
 <p className="text-zinc-500 font-black tracking-widest text-[10px]">No Active Coupons</p>
 </div>
 )}
 </div>

  {isAdding && (
   <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-12 overflow-y-auto">
    <div className="bg-white w-full max-w-lg rounded-[32px] lg:rounded-[40px] p-6 lg:p-10 shadow-2xl">
     <h2 className="text-2xl lg:text-3xl font-headline font-black text-zinc-900 mb-6 lg:mb-8 tracking-tight uppercase">Create Coupon</h2>
     <div className="space-y-6">
      <div>
       <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-1.5 lg:mb-2 block uppercase">Coupon Code</label>
       <input type="text" placeholder="e.g. SAVE20" value={newCoupon.code}
        onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
        className="w-full bg-zinc-50 border-none rounded-xl lg:rounded-2xl p-4 lg:p-5 font-bold text-xs lg:text-sm focus:ring-2 ring-primary transition-all tracking-widest uppercase" />
      </div>
      <div>
       <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-1.5 lg:mb-2 block uppercase">Discount (%)</label>
       <input type="number" placeholder="20" value={newCoupon.discount || ""}
        onChange={(e) => setNewCoupon({...newCoupon, discount: parseInt(e.target.value)})}
        className="w-full bg-zinc-50 border-none rounded-xl lg:rounded-2xl p-4 lg:p-5 font-bold text-xs lg:text-sm focus:ring-2 ring-primary transition-all" />
      </div>
      <div className="flex gap-3 lg:gap-4 pt-4 lg:pt-6">
       <button onClick={() => setIsAdding(false)} className="flex-1 bg-zinc-100 text-zinc-500 py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black tracking-widest text-[9px] lg:text-[10px] uppercase">Discard</button>
       <button onClick={handleAddCoupon} className="flex-1 bg-zinc-900 text-white py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black tracking-widest text-[9px] lg:text-[10px] uppercase shadow-lg shadow-zinc-900/10">Release</button>
      </div>
     </div>
    </div>
   </div>
  )}
 </div>
 );
}
