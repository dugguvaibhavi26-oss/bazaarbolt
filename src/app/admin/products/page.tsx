"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/types";
import { mapProduct, mapQuerySnapshot } from "@/lib/mappers";
import toast from "react-hot-toast";

const CATEGORIES = ["Vegetables", "Dairy", "Munchies", "Beverages", "Care", "Household"];

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: 0,
    image: "",
    category: "Vegetables",
    description: "",
    stock: 100,
    active: true
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "products"), (snap) => {
      try {
        const prods = mapQuerySnapshot(snap, mapProduct).filter(p => !p.isDeleted);
        setProducts(prods);
      } catch (e) {
        console.error("Mapping error in AdminProducts:", e);
        toast.error("Error loading inventory data");
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.image || newProduct.price <= 0) {
      toast.error("Please fill all fields");
      return;
    }
    const toastId = toast.loading("Adding product...");
    try {
      await addDoc(collection(db, "products"), { ...newProduct, createdAt: new Date().toISOString() });
      setNewProduct({ name: "", price: 0, image: "", category: "Vegetables", description: "", stock: 100, active: true });
      setIsAdding(false);
      toast.success("Added to inventory", { id: toastId });
    } catch (err) {
      toast.error("Failed to add", { id: toastId });
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
       await updateDoc(doc(db, "products", id), { active: !current });
       toast.success(current ? "Hidden from store" : "Live on store");
    } catch(e) { toast.error("Update failed"); }
  };

  const removeProduct = async (id: string) => {
    if (confirm("Soft delete this product?")) {
      await updateDoc(doc(db, "products", id), { isDeleted: true, active: false });
      toast.success("Archived");
    }
  };

  if (loading) return (
     <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 w-48 bg-white rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
           {[1,2,3,4].map(n => <div key={n} className="h-40 bg-white rounded-3xl" />)}
        </div>
     </div>
  );

  return (
    <div className="space-y-10 pb-32">
       <div className="flex items-center justify-between">
          <div>
             <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Inventory Control</h3>
             <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Total SKU Count: {products.length}</p>
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-black shadow-xl active:scale-95 transition-all">
             <span className="material-symbols-outlined text-sm">inventory</span>
             Add New SKU
          </button>
       </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
           {products.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-3 shadow-sm border border-zinc-100 group transition-all">
                 <div className="aspect-square bg-zinc-50 rounded-xl mb-2 p-2 flex items-center justify-center border border-zinc-50 relative overflow-hidden">
                    <img src={p.image} alt={p.name} className="w-20 h-20 object-contain group-hover:scale-110 transition-transform" />
                    <div className="absolute top-1 right-1 flex flex-col gap-1 items-end">
                       <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border ${p.active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                          {p.active ? 'LIVE' : 'HIDDEN'}
                       </span>
                    </div>
                 </div>
                 <h4 className="font-headline font-black text-[10px] text-zinc-900 truncate mb-0.5 leading-tight">{p.name}</h4>
                 <p className="text-[7px] font-black text-zinc-400 uppercase tracking-[0.1em] mb-3">{p.category}</p>
                 
                 <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
                    <span className="font-headline font-black text-xs text-zinc-900 tracking-tighter">₹{p.price.toFixed(0)}</span>
                    <div className="flex gap-1.5">
                       <button onClick={() => toggleActive(p.id, p.active)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 hover:text-zinc-900 transition-colors">
                          <span className="material-symbols-outlined text-[14px]">{p.active ? 'visibility_off' : 'visibility'}</span>
                       </button>
                       <button onClick={() => removeProduct(p.id)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 hover:text-red-500 transition-colors">
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                       </button>
                    </div>
                 </div>
              </div>
           ))}
        </div>

       {isAdding && (
          <div className="fixed inset-0 z-[60] bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-2xl rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 -z-10">
                   <span className="material-symbols-outlined text-[140px]">inventory</span>
                </div>
                
                <div className="flex justify-between items-start mb-10">
                   <div>
                      <h2 className="text-3xl font-headline font-black text-zinc-900 tracking-tight">New Inventory Item</h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">Manual SKU Entry</p>
                   </div>

                </div>

                <form onSubmit={handleAdd} className="space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1 mb-2 block">Product Name</label>
                         <input type="text" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all" />
                      </div>
                      <div>
                         <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1 mb-2 block">Category</label>
                         <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all">
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                      </div>
                      <div>
                         <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1 mb-2 block">Price (₹)</label>
                         <input type="number" required value={newProduct.price || ""} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all" />
                      </div>
                      <div>
                         <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1 mb-2 block">Opening Stock</label>
                         <input type="number" required value={newProduct.stock || ""} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all" />
                      </div>
                      <div className="col-span-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1 mb-2 block">Image URL</label>
                         <input type="text" required value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all" />
                      </div>
                      <div className="col-span-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1 mb-2 block">Product Description</label>
                         <textarea 
                           value={newProduct.description} 
                           onChange={e => setNewProduct({...newProduct, description: e.target.value})} 
                           rows={3}
                           className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all resize-none"
                           placeholder="Enter product highlights, usage, etc."
                         />
                      </div>
                   </div>
                   
                   <div className="flex gap-4 pt-6">
                      <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-zinc-100 text-zinc-500 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-zinc-200">Cancel</button>
                      <button type="submit" className="flex-1 bg-zinc-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-black shadow-xl shadow-zinc-900/10">Add SKU</button>
                   </div>
                </form>
             </div>
          </div>
       )}
    </div>
  );
}
