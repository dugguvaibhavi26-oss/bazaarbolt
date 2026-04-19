"use client";

import { useStore } from "@/store/useStore";
import { useEffect, useState } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

export default function AdminPaymentsPage() {
 const { settings } = useStore();
 const [loading, setLoading] = useState(false);

 const [form, setForm] = useState({
 taxPercent: 5,
 handlingCharge: 2,
 deliveryFee: 25,
 freeDeliveryThreshold: 500,
 smallCartFee: 20,
 smallCartThreshold: 99,
 customCharges: [] as { label: string; amount: number }[]
 });

 useEffect(() => {
 if (settings) {
 setForm({
 taxPercent: settings.taxPercent || 0,
 handlingCharge: settings.handlingCharge || 0,
 deliveryFee: settings.deliveryFee || 0,
 freeDeliveryThreshold: settings.freeDeliveryThreshold || 0,
 smallCartFee: settings.smallCartFee || 0,
 smallCartThreshold: settings.smallCartThreshold || 0,
 customCharges: settings.customCharges || []
 });
 }
 }, [settings]);

 const handleUpdate = async () => {
 setLoading(true);
 try {
 const settingsRef = doc(db, "settings", "config");
 await setDoc(settingsRef, form, { merge: true });
 toast.success("Payment settings updated! 💸");
 } catch (error) {
 console.error("Payment Update Error:", error);
 toast.error("Failed to update settings");
 } finally {
 setLoading(false);
 }
 };

 const addCustomCharge = () => {
 setForm({
 ...form,
 customCharges: [...form.customCharges, { label: "", amount: 0 }]
 });
 };

 const removeCustomCharge = (index: number) => {
 const list = [...form.customCharges];
 list.splice(index, 1);
 setForm({ ...form, customCharges: list });
 };

 const updateCustomCharge = (index: number, field: "label"| "amount", value: any) => {
 const list = [...form.customCharges];
 list[index] = { ...list[index], [field]: field === "amount"? Number(value) : value };
 setForm({ ...form, customCharges: list });
 };

 return (
 <div className="p-6 max-w-4xl mx-auto pb-40">
 <div className="mb-10">
 <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Payment Control</h1>
 <p className="text-zinc-500 font-bold text-sm">Configure fees, taxes, and thresholds</p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {/* Core Charges */}
 <div className="space-y-6">
 <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
 <h2 className="text-xs font-black text-zinc-400 tracking-widest flex items-center gap-2">
 <span className="material-symbols-outlined text-sm">receipt_long</span>
 Standard Taxes & Base Fees
 </h2>

 <div className="space-y-4">
 <div>
 <label className="text-[10px] font-black text-zinc-500 mb-1 block">Taxes (GST %)</label>
 <input
 type="number"
 value={form.taxPercent}
 onChange={(e) => setForm({ ...form, taxPercent: Number(e.target.value) })}
 className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 font-black text-zinc-900 focus:ring-2 ring-primary/20 outline-none"
 />
 </div>
 <div>
 <label className="text-[10px] font-black text-zinc-500 mb-1 block">Platform Handling Fee (₹)</label>
 <input
 type="number"
 value={form.handlingCharge}
 onChange={(e) => setForm({ ...form, handlingCharge: Number(e.target.value) })}
 className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 font-black text-zinc-900 focus:ring-2 ring-primary/20 outline-none"
 />
 </div>
 </div>
 </div>

 <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
 <h2 className="text-xs font-black text-zinc-400 tracking-widest flex items-center gap-2">
 <span className="material-symbols-outlined text-sm">delivery_dining</span>
 Delivery Configuration
 </h2>

 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-[10px] font-black text-zinc-500 mb-1 block">Delivery Fee (₹)</label>
 <input
 type="number"
 value={form.deliveryFee}
 onChange={(e) => setForm({ ...form, deliveryFee: Number(e.target.value) })}
 className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 font-black text-zinc-900 outline-none"
 />
 </div>
 <div>
 <label className="text-[10px] font-black text-zinc-500 mb-1 block">Threshold for FREE (₹)</label>
 <input
 type="number"
 value={form.freeDeliveryThreshold}
 onChange={(e) => setForm({ ...form, freeDeliveryThreshold: Number(e.target.value) })}
 className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 font-black text-zinc-900 outline-none"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-[10px] font-black text-zinc-500 mb-1 block">Small Cart Fee (₹)</label>
 <input
 type="number"
 value={form.smallCartFee}
 onChange={(e) => setForm({ ...form, smallCartFee: Number(e.target.value) })}
 className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 font-black text-zinc-900 outline-none"
 />
 </div>
 <div>
 <label className="text-[10px] font-black text-zinc-500 mb-1 block">Threshold for Small Fee (₹)</label>
 <input
 type="number"
 value={form.smallCartThreshold}
 onChange={(e) => setForm({ ...form, smallCartThreshold: Number(e.target.value) })}
 className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 font-black text-zinc-900 outline-none"
 />
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Custom Charges Dynamic Section */}
 <div className="space-y-6">
 <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm h-fit">
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xs font-black text-zinc-400 tracking-widest flex items-center gap-2">
 <span className="material-symbols-outlined text-sm">add_card</span>
 Dynamic Custom Charges
 </h2>
 <button onClick={addCustomCharge} className="bg-primary/10 text-primary p-2 rounded-xl hover:bg-primary hover:text-white transition-all">
 <span className="material-symbols-outlined">add</span>
 </button>
 </div>

 <div className="space-y-3">
 {form.customCharges.length === 0 && (
 <p className="text-center text-[10px] font-bold text-zinc-300 py-10 border-2 border-dashed border-zinc-50 rounded-2xl">No custom charges added</p>
 )}
 {form.customCharges.map((charge, idx) => (
 <div key={idx} className="flex gap-2 items-end">
 <div className="flex-1">
 <label className="text-[9px] font-black text-zinc-400 mb-1 block">Title (e.g. Bag Charge)</label>
 <input
 type="text"
 value={charge.label}
 onChange={(e) => updateCustomCharge(idx, "label", e.target.value)}
 className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2 text-xs font-black"
 />
 </div>
 <div className="w-24">
 <label className="text-[9px] font-black text-zinc-400 mb-1 block">Amount (₹)</label>
 <input
 type="number"
 value={charge.amount}
 onChange={(e) => updateCustomCharge(idx, "amount", e.target.value)}
 className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2 text-xs font-black"
 />
 </div>
 <button onClick={() => removeCustomCharge(idx)} className="bg-red-50 text-red-500 p-2 rounded-xl mb-0.5 hover:bg-red-500 hover:text-white transition-all">
 <span className="material-symbols-outlined text-sm">delete</span>
 </button>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>

 <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-sm px-6">
 <button
 onClick={handleUpdate}
 disabled={loading}
 className="w-full bg-zinc-900 text-white h-16 rounded-3xl font-black tracking-widest text-xs shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
 >
 {loading ? 'Saving Changes...': 'Save Payment Config'}
 <span className="material-symbols-outlined">payments</span>
 </button>
 </div>
 </div>
 );
}
