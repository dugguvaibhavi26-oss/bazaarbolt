"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

export default function AdminVendors() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVendors() {
      setLoading(true);
      try {
        const q = query(collection(db, "users"), where("role", "==", "vendor"));
        const snap = await getDocs(q);
        setVendors(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        toast.error("Failed to load vendors");
      } finally {
        setLoading(false);
      }
    }
    fetchVendors();
  }, []);

  const toggleVendorStatus = async (vendorId: string, currentStatus: string) => {
    const newStatus = currentStatus === "online" ? "offline" : "online";
    try {
      await updateDoc(doc(db, "users", vendorId), { vendorStatus: newStatus });
      setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, vendorStatus: newStatus } : v));
      toast.success(`Vendor is now ${newStatus}`);
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  if (loading) return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-10 w-48 bg-white rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(n => <div key={n} className="h-32 bg-white rounded-3xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-32">
      <div>
        <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Vendor Management</h3>
        <p className="text-xs font-bold text-zinc-400 tracking-widest mt-1 uppercase">Total Active Vendors: {vendors.length}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map(vendor => (
          <div key={vendor.id} className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 -z-0">
              <span className="material-symbols-outlined text-6xl">storefront</span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-100">
                <span className="material-symbols-outlined text-zinc-400">person</span>
              </div>
              <div>
                <h4 className="text-sm font-black text-zinc-900 tracking-tight">{vendor.name}</h4>
                <p className="text-[10px] font-bold text-zinc-400 truncate max-w-[150px]">{vendor.email}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-zinc-300 tracking-[0.2em] uppercase">Status</span>
                <span className={`text-[10px] font-black tracking-widest uppercase ${vendor.vendorStatus === 'online' ? 'text-green-500' : 'text-red-500'}`}>
                  {vendor.vendorStatus || 'OFFLINE'}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-zinc-300 tracking-[0.2em] uppercase">UID</span>
                <span className="text-[10px] font-bold text-zinc-400 font-mono select-all cursor-pointer" title="Click to copy UID" onClick={() => { navigator.clipboard.writeText(vendor.id); toast.success("UID Copied!"); }}>
                  {vendor.id.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>
        ))}
        {vendors.length === 0 && (
          <div className="md:col-span-3 py-20 text-center">
            <p className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">No vendors found. Create a user with role 'vendor' to see them here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
