"use client";

import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Product } from "@/types";
import toast from "react-hot-toast";
import { Portal } from "@/components/Portal";

export default function VendorProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "products"),
      where("vendorId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prods);
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setLoading(true);
    const toastId = toast.loading("Updating product...");
    try {
      const prodRef = doc(db, "products", editingProduct.id);
      await updateDoc(prodRef, {
        mrp: Number(editingProduct.mrp),
        price: Number(editingProduct.price), // Usually price = mrp - discount, but here we update both
        stock: Number(editingProduct.stock),
        vendorAvailable: editingProduct.vendorAvailable,
        lastUpdatedBy: "vendor",
        updatedAt: new Date().toISOString()
      });
      toast.success("Product updated", { id: toastId });
      setEditingProduct(null);
    } catch (e) {
      toast.error("Failed to update product", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (product: Product) => {
    const toastId = toast.loading("Toggling availability...");
    try {
      const prodRef = doc(db, "products", product.id);
      await updateDoc(prodRef, {
        vendorAvailable: !product.vendorAvailable,
        lastUpdatedBy: "vendor",
        updatedAt: new Date().toISOString()
      });
      toast.success(product.vendorAvailable ? "Turned OFF" : "Turned ON", { id: toastId });
    } catch (e) {
      toast.error("Failed to update", { id: toastId });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">My Products</h2>
        <span className="text-[10px] font-bold text-zinc-400 tracking-widest">{products.length} ITEMS</span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {products.map(product => (
          <div key={product.id} className="bg-white p-4 rounded-[28px] border border-zinc-100 flex gap-4 items-center">
            <div className="w-20 h-20 bg-zinc-50 rounded-2xl p-2 border border-zinc-50 flex-shrink-0">
              <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${product.vendorAvailable && product.stock > 0 && product.adminActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <p className="text-[10px] font-black text-zinc-400 tracking-widest uppercase truncate">{product.category}</p>
              </div>
              <h3 className="text-sm font-black text-zinc-900 truncate leading-tight mb-1">{product.name}</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-zinc-900">₹{product.price}</span>
                <span className="text-[10px] font-bold text-zinc-400">Stock: {product.stock}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setEditingProduct(product)}
                className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-primary/10 hover:text-primary transition-all"
              >
                <span className="material-symbols-outlined text-xl">edit</span>
              </button>
              <button 
                onClick={() => toggleAvailability(product)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${product.vendorAvailable ? 'bg-green-50 text-green-500' : 'bg-zinc-100 text-zinc-400'}`}
              >
                <span className="material-symbols-outlined text-xl">{product.vendorAvailable ? 'toggle_on' : 'toggle_off'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingProduct && (
        <Portal>
          <div className="fixed inset-0 z-[100] bg-zinc-950/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white max-w-sm w-full rounded-[40px] p-8 shadow-2xl relative animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-500 overflow-hidden">
            <h3 className="text-xl font-black text-zinc-900 tracking-tight mb-6 uppercase">Edit Product</h3>
            
            <form onSubmit={handleUpdateProduct} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 block uppercase">MRP (₹)</label>
                <input 
                  type="number"
                  className="w-full bg-zinc-50 border-zinc-100 rounded-2xl p-4 text-sm font-bold"
                  value={editingProduct.mrp}
                  onChange={(e) => setEditingProduct({ ...editingProduct, mrp: Number(e.target.value), price: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 block uppercase">Stock Quantity</label>
                <input 
                  type="number"
                  className="w-full bg-zinc-50 border-zinc-100 rounded-2xl p-4 text-sm font-bold"
                  value={editingProduct.stock}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                <span className="text-[10px] font-black text-zinc-900 tracking-widest uppercase">Availability</span>
                <button 
                  type="button"
                  onClick={() => setEditingProduct({ ...editingProduct, vendorAvailable: !editingProduct.vendorAvailable })}
                  className={`w-12 h-6 rounded-full transition-all relative ${editingProduct.vendorAvailable ? 'bg-primary' : 'bg-zinc-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editingProduct.vendorAvailable ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button 
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="py-4 rounded-2xl bg-zinc-50 text-zinc-400 font-black text-[10px] tracking-widest transition-all"
                >
                  CANCEL
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="py-4 rounded-2xl bg-primary text-zinc-900 font-black text-[10px] tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
