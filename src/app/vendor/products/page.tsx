"use client";

import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Product } from "@/types";
import toast from "react-hot-toast";
import { Portal } from "@/components/Portal";

export default function VendorProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"categories" | "products">("categories");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [filterStock0, setFilterStock0] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      const catSnap = await getDocs(collection(db, "categories"));
      setCategories(catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
    fetchCategories();
  }, []);

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

  const filteredProducts = products.filter(p => {
    const categoryText = Array.isArray(p.category)
      ? p.category.join(" ").toLowerCase()
      : (p.category || "").toLowerCase();

    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          categoryText.includes(searchTerm.toLowerCase());
    
    let matchesCategory = true;
    if (selectedCategory) {
      const productCategories = Array.isArray(p.category) ? p.category : [p.category || ""];
      const target = selectedCategory.toLowerCase().trim();
      const cat = categories.find(c => c.id === selectedCategory);
      const catLabel = cat?.label?.toLowerCase().trim();

      matchesCategory = productCategories.some(c => 
        c?.toLowerCase().trim() === target || (catLabel && c?.toLowerCase().trim() === catLabel)
      );
    }

    let matchesSubcategory = true;
    if (selectedSubcategory) {
      const productSubcategories = Array.isArray(p.subcategory) ? p.subcategory : [p.subcategory || ""];
      matchesSubcategory = productSubcategories.some(s => s === selectedSubcategory);
    }
                              
    const matchesStock = !filterStock0 || p.stock === 0;
    
    return matchesSearch && matchesCategory && matchesSubcategory && matchesStock;
  });

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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">My Inventory</h2>
          <span className="text-[10px] font-bold text-zinc-400 tracking-widest">{filteredProducts.length} ITEMS</span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-xl">search</span>
          <input 
            type="text"
            placeholder="Search your products..."
            className="w-full bg-white border border-zinc-100 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold shadow-sm focus:ring-2 ring-primary transition-all"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (e.target.value) setViewMode("products");
            }}
          />
        </div>

        {/* Filter Bar */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <button 
            onClick={() => setFilterStock0(!filterStock0)}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 flex items-center gap-2 ${filterStock0 ? 'bg-red-50 border-red-100 text-red-600 shadow-inner' : 'bg-white border-zinc-100 text-zinc-400'}`}
          >
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            Out of Stock
          </button>
        </div>
      </div>

      {viewMode === "categories" ? (
        <div className="grid grid-cols-2 gap-4">
          {categories.filter(c => products.some(p => {
             const pCats = Array.isArray(p.category) ? p.category : [p.category || ""];
             const target = c.id?.toLowerCase().trim();
             const label = c.label?.toLowerCase().trim();
             return pCats.some(pc => pc.toLowerCase().trim() === target || pc.toLowerCase().trim() === label);
          })).map(cat => (
            <button 
              key={cat.id} 
              onClick={() => { setSelectedCategory(cat.id); setViewMode("products"); }}
              className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm hover:shadow-md transition-all group flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-zinc-50 rounded-2xl p-3 mb-3 group-hover:scale-110 transition-transform flex items-center justify-center">
                <img src={cat.img} alt="" className="w-full h-full object-contain" />
              </div>
              <h4 className="font-black text-[10px] text-zinc-900 tracking-tight uppercase">{cat.label}</h4>
              <p className="text-[8px] font-black text-zinc-400 mt-1 uppercase tracking-widest">
                {products.filter(p => {
                  const pCats = Array.isArray(p.category) ? p.category : [p.category || ""];
                  const target = cat.id?.toLowerCase().trim();
                  const label = cat.label?.toLowerCase().trim();
                  return pCats.some(pc => pc.toLowerCase().trim() === target || pc.toLowerCase().trim() === label);
                }).length} Items
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { setViewMode("categories"); setSelectedCategory(null); setSelectedSubcategory(null); }}
                className="p-3 bg-white rounded-xl border border-zinc-100 text-zinc-400 hover:text-zinc-900 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shrink-0"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back
              </button>
              {selectedCategory && (
                <div className="bg-zinc-900 text-white px-4 py-3 rounded-xl flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-widest">{categories.find(c => c.id === selectedCategory)?.label}</span>
                </div>
              )}
            </div>

            {selectedCategory && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                <button 
                  onClick={() => setSelectedSubcategory(null)}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${!selectedSubcategory ? 'bg-zinc-900 text-white border-zinc-900 shadow-md' : 'bg-white text-zinc-400 border-zinc-100 hover:bg-zinc-50'}`}
                >
                  All
                </button>
                {categories.find(c => c.id === selectedCategory)?.subcategories?.map((sub: any) => {
                  const subLabel = typeof sub === 'string' ? sub : sub.label;
                  return (
                    <button 
                      key={subLabel}
                      onClick={() => setSelectedSubcategory(subLabel === selectedSubcategory ? null : subLabel)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${subLabel === selectedSubcategory ? 'bg-primary text-zinc-900 border-primary shadow-md' : 'bg-white text-zinc-400 border-zinc-100 hover:bg-zinc-50'}`}
                    >
                      {subLabel}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white p-4 rounded-[28px] border border-zinc-100 flex gap-4 items-center">
                <div className="w-20 h-20 bg-zinc-50 rounded-2xl p-2 border border-zinc-50 flex-shrink-0">
                  <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${product.vendorAvailable && product.stock > 0 && product.adminActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <p className="text-[10px] font-black text-zinc-400 tracking-widest uppercase truncate">
                      {Array.isArray(product.category) ? product.category.join(', ') : product.category}
                    </p>
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
            {filteredProducts.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-zinc-300 text-3xl">search_off</span>
                </div>
                <p className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">No matching products</p>
              </div>
            )}
          </div>
        </div>
      )}

      {editingProduct && (
        <Portal>
          <div className="fixed inset-0 z-[100] bg-zinc-950/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white max-w-sm w-full rounded-[40px] p-8 shadow-2xl relative animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-500 overflow-hidden">
            <h3 className="text-xl font-black text-zinc-900 tracking-tight mb-2 uppercase">Edit Product</h3>
            <p className="text-[10px] font-bold text-zinc-400 tracking-widest mb-6 uppercase">{editingProduct.name}</p>
            
            <form onSubmit={handleUpdateProduct} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 block uppercase">Stock Quantity</label>
                <input 
                  type="number"
                  required
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
