"use client";

import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Address } from "@/types";

export default function AddressBookPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<Address>({
    line1: "",
    line2: "",
    city: "",
    pincode: "",
    landmark: ""
  });

  const addresses: Address[] = userData?.addresses || [];

  const handleSave = async () => {
    if (!user) return;
    if (!formData.line1 || !formData.city || !formData.pincode) return toast.error("PLEASE FILL REQUIRED FIELDS");

    const toastId = toast.loading("UPDATING RECORDS...");
    try {
      const userRef = doc(db, "users", user.uid);
      
      if (editingAddress) {
        // Update existing: remove old, add new
        const updated = addresses.map(a => 
          (a.line1 === editingAddress.line1 && a.pincode === editingAddress.pincode) ? formData : a
        );
        await updateDoc(userRef, { addresses: updated });
      } else {
        // Add new
        await updateDoc(userRef, {
          addresses: arrayUnion(formData)
        });
      }
      
      toast.success("ADDRESS SAVED!", { id: toastId });
      setShowModal(false);
      setEditingAddress(null);
      setFormData({ line1: "", line2: "", city: "", pincode: "", landmark: "" });
    } catch (err) {
      toast.error("PROCESS FAILED", { id: toastId });
    }
  };

  const deleteAddress = async (addr: Address) => {
    if (!user) return;
    const toastId = toast.loading("REMOVING...");
    try {
      await updateDoc(doc(db, "users", user.uid), {
        addresses: arrayRemove(addr)
      });
      toast.success("REMOVED", { id: toastId });
    } catch (err) {
      toast.error("FAILED", { id: toastId });
    }
  };

  const openEdit = (addr: Address) => {
    setEditingAddress(addr);
    setFormData(addr);
    setShowModal(true);
  };

  if (loading || !user) return null;

  return (
    <main className="min-h-screen bg-zinc-50 pb-32">
      <header className="sticky top-0 w-full z-50 bg-white shadow-sm border-b border-zinc-100 pt-safe">
        <div className="flex items-center px-4 py-4 w-full max-w-3xl mx-auto gap-4">
          <button onClick={() => router.push("/profile")} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <span className="material-symbols-outlined text-zinc-900">arrow_back</span>
          </button>
          <div className="flex flex-col uppercase">
             <h1 className="text-xl font-headline font-black text-zinc-900 tracking-tight uppercase">Address Book</h1>
             <span className="text-[10px] font-black text-zinc-400 tracking-widest mt-1 uppercase">{addresses.length} saved records</span>
          </div>
          <button 
            onClick={() => { setEditingAddress(null); setFormData({line1:"", line2:"", city:"", pincode:"", landmark:""}); setShowModal(true); }}
            className="ml-auto bg-zinc-900 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all uppercase"
          >
            <span className="material-symbols-outlined uppercase">add</span>
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 pt-8 space-y-4 uppercase">
        {addresses.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center opacity-40 uppercase">
             <span className="material-symbols-outlined text-6xl mb-4">location_off</span>
             <p className="font-headline font-black text-sm text-zinc-500 uppercase tracking-widest leading-none">No addresses saved yet</p>
          </div>
        ) : (
          addresses.map((addr, idx) => (
            <div key={idx} className="bg-white rounded-[32px] p-6 border border-zinc-100 shadow-sm flex items-start justify-between group transition-all hover:border-primary/20 uppercase">
              <div className="flex gap-4 uppercase">
                <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                   <span className="material-symbols-outlined">home</span>
                </div>
                <div className="uppercase">
                   <h3 className="font-headline font-black text-sm text-zinc-900 uppercase tracking-tight ">{addr.city}</h3>
                   <p className="text-[11px] font-bold text-zinc-400 mt-1 leading-relaxed max-w-[200px] uppercase">
                     {addr.line1}, {addr.landmark && `${addr.landmark}, `}{addr.pincode}
                   </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(addr)} className="w-10 h-10 rounded-xl hover:bg-zinc-100 text-zinc-400 flex items-center justify-center transition-colors">
                   <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                <button onClick={() => deleteAddress(addr)} className="w-10 h-10 rounded-xl hover:bg-red-50 text-red-300 flex items-center justify-center transition-colors">
                   <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-zinc-950/40 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500 overflow-hidden relative uppercase">
             <div className="absolute top-0 right-0 p-10 opacity-5 -z-10 uppercase"><span className="material-symbols-outlined text-[140px] uppercase">location_on</span></div>
             <div className="flex justify-between items-start mb-10 uppercase">
               <div className="uppercase">
                  <h2 className="text-4xl font-headline font-black text-zinc-900 tracking-tighter leading-none uppercase">{editingAddress ? 'Revise' : 'New Address'}</h2>
                  <p className="text-[10px] font-bold text-zinc-400 tracking-widest mt-2 uppercase">Where should we bolt your order?</p>
               </div>
             </div>
             <div className="space-y-6 uppercase">
                <div className="grid grid-cols-1 gap-4 uppercase">
                  <div className="space-y-1.5 uppercase">
                    <label className="text-[9px] font-black tracking-widest text-zinc-400 ml-1 block uppercase">Building / street / house no.</label>
                    <input type="text" placeholder="Flat no, house name, street" className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-4 ring-primary/20 transition-all uppercase placeholder:uppercase" value={formData.line1} onChange={e => setFormData({ ...formData, line1: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 uppercase">
                    <div className="space-y-1.5 uppercase">
                      <label className="text-[9px] font-black tracking-widest text-zinc-400 ml-1 block uppercase">City</label>
                      <input type="text" placeholder="e.g. Noida" className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-4 ring-primary/20 transition-all uppercase placeholder:uppercase" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                    </div>
                    <div className="space-y-1.5 uppercase">
                      <label className="text-[9px] font-black tracking-widest text-zinc-400 ml-1 block uppercase">Pincode</label>
                      <input type="number" placeholder="110001" className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-4 ring-primary/20 transition-all uppercase placeholder:uppercase" value={formData.pincode} onChange={e => setFormData({ ...formData, pincode: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5 uppercase">
                    <label className="text-[9px] font-black tracking-widest text-zinc-400 ml-1 block uppercase">Landmark (optional)</label>
                    <input type="text" placeholder="e.g. Near Apollo Hospital" className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-4 ring-primary/20 transition-all uppercase placeholder:uppercase" value={formData.landmark} onChange={e => setFormData({ ...formData, landmark: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-4 pt-6 uppercase">
                   <button onClick={() => setShowModal(false)} className="flex-1 bg-zinc-100 text-zinc-500 py-5 rounded-3xl font-black tracking-widest text-[10px] transition-all hover:bg-zinc-200 uppercase">Cancel</button>
                   <button onClick={handleSave} className="flex-1 bg-zinc-900 text-white py-5 rounded-3xl font-black tracking-widest text-[10px] transition-all hover:bg-black shadow-xl shadow-zinc-900/10 uppercase">Registry Update</button>
                </div>
             </div>
           </div>
        </div>
      )}
    </main>
  );
}
