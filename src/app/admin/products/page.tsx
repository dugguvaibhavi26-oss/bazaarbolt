"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Product } from "@/types";
import { mapProduct, mapQuerySnapshot } from "@/lib/mappers";
import toast from "react-hot-toast";
import { validateProducts, parseFile, downloadTemplate } from "@/lib/bulkUploadUtils";
import { triggerNotification } from "@/lib/notificationClient";
import { Portal } from "@/components/Portal";

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<"BB" | "CAFE">("BB");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: 0,
    image: "",
    category: "",
    description: "",
    stock: 100,
    active: true,
    adminActive: true,
    vendorAvailable: true,
    vendorId: "",
    mrp: 0,
    section: "BB" as "BB" | "CAFE",
    isBestseller: false,
    subcategory: ""
  });

  const [uploadMode, setUploadMode] = useState<"manual" | "bulk">("manual");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<Partial<Product>[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState({ total: 0, valid: 0, failed: 0 });

  const [searchTerm, setSearchTerm] = useState("");
  const [displayCount, setDisplayCount] = useState(24);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const prodSnap = await getDocs(collection(db, "products"));
        const prods = mapQuerySnapshot(prodSnap, mapProduct).filter(p => !p.isDeleted);
        setProducts(prods);

        const catSnap = await getDocs(collection(db, "categories"));
        const cats = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCategories(cats);
      } catch (e) {
        console.error("mapping error:", e);
        toast.error("Error loading inventory");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.image || newProduct.price <= 0) {
      toast.error("Please fill all fields");
      return;
    }
    const toastId = toast.loading(editingProduct ? "Updating product..." : "Adding product...");
    try {
      if (editingProduct) {
        await updateDoc(doc(db, "products", editingProduct.id), { ...newProduct });
        toast.success("Updated SKU", { id: toastId });
      } else {
        await addDoc(collection(db, "products"), { ...newProduct, createdAt: new Date().toISOString() });
        // Notify customers
        triggerNotification({
          topic: "customers",
          title: "New Product Available! 🛒",
          body: `Freshly added: ${newProduct.name}. Shop now!`,
        });
        toast.success("Added to inventory", { id: toastId });
      }

      setNewProduct({ 
        name: "", 
        price: 0, 
        image: "", 
        category: categories[0]?.id || "", 
        description: "", 
        stock: 100, 
        active: true, 
        adminActive: true,
        vendorAvailable: true,
        vendorId: "",
        mrp: 0,
        section: "BB", 
        isBestseller: false, 
        subcategory: "" 
      });
      setIsAdding(false);
      setEditingProduct(null);
    } catch (err) {
      toast.error(editingProduct ? "Update failed" : "Failed to add", { id: toastId });
    }
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    const categoryId = categories.find(c => c.id === product.category || c.label === product.category)?.id || product.category;

    setNewProduct({
      name: product.name,
      price: product.price,
      image: product.image,
      category: categoryId,
      description: product.description || "",
      stock: product.stock,
      active: product.active,
      adminActive: product.adminActive ?? true,
      vendorAvailable: product.vendorAvailable ?? true,
      vendorId: product.vendorId || "",
      mrp: product.mrp || product.price,
      section: (product as any).section || "BB",
      isBestseller: product.isBestseller || false,
      subcategory: product.subcategory || ""
    });
    setIsAdding(true);
  };

  const startAdd = () => {
    setEditingProduct(null);
    setNewProduct(prev => ({ ...prev, section: activeTab }));
    setIsAdding(true);
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, "products", id), { active: !current });
      toast.success(current ? "Hidden from store" : "Live on store");
    } catch (e) { toast.error("Update failed"); }
  };

  const toggleBestseller = async (id: string, current: boolean) => {
    try {
      await updateDoc(doc(db, "products", id), { isBestseller: !current });
      setProducts(prev => prev.map(p => p.id === id ? { ...p, isBestseller: !current } : p));
      toast.success(!current ? "Marked as Bestseller" : "Removed from Bestsellers");
    } catch (e) { toast.error("Update failed"); }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      try {
        const rawData = await parseFile(file);
        const { valid, invalid } = validateProducts(rawData, activeTab);
        setPreviewData(valid);
        setUploadStats({ total: rawData.length, valid: valid.length, failed: invalid.length });
        if (invalid.length > 0) {
          toast.error(`${invalid.length} rows were invalid and will be skipped.`);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to parse file");
        setUploadFile(null);
        setPreviewData([]);
      }
    }
  };

  const handleBulkUpload = async () => {
    if (previewData.length === 0) {
      toast.error("No valid products to upload");
      return;
    }
    setIsUploading(true);
    const tid = toast.loading(`Uploading ${previewData.length} products...`);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User session not found. Please re-login.");
      }
      const idToken = await user.getIdToken(true);
      const resp = await fetch("/api/admin/products/bulk-upload", {
        method: "POST",
        body: JSON.stringify({ products: previewData }),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        }
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${resp.status}`);
      }

      const data = await resp.json();
      if (data.success) {
        toast.success(`Successfully uploaded ${data.count} products`, { id: tid });
        triggerNotification({
          topic: "customers",
          title: "New Products Added 🛒",
          body: "Check out the latest arrivals in our store!",
        });

        setIsAdding(false);
        setUploadFile(null);
        setPreviewData([]);
        setUploadMode("manual");
      } else {
        toast.error(data.error || "Upload failed", { id: tid });
      }
    } catch (err: any) {
      console.error("Bulk upload fetch error:", err);
      toast.error(`Network error: ${err.message || "Please check console"}`, { id: tid });
    } finally {
      setIsUploading(false);
    }
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
        {[1, 2, 3, 4].map(n => <div key={n} className="h-40 bg-white rounded-3xl" />)}
      </div>
    </div>
  );

  const filteredProducts = products.filter(p => {
    const section = (p as any).section || 'BB';
    const matchesSection = section === activeTab;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.vendorId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSection && matchesSearch;
  });

  const paginatedProducts = filteredProducts.slice(0, displayCount);

  return (
    <div className="space-y-6 lg:space-y-10 pb-32">
      {/* Search and Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex-1">
          <h3 className="text-xl lg:text-2xl font-black text-zinc-900 tracking-tight leading-none mb-2">Inventory Control</h3>
          <p className="text-[10px] lg:text-xs font-bold text-zinc-400 tracking-widest uppercase">Total SKU Count: {filteredProducts.length}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 max-w-2xl">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">search</span>
            <input 
              type="text"
              placeholder="Search by name, category or vendor..."
              className="w-full bg-white border border-zinc-100 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold shadow-sm focus:ring-2 ring-primary transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={startAdd} className="bg-zinc-900 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] tracking-widest flex items-center gap-2 hover:bg-black shadow-xl active:scale-95 transition-all w-full sm:w-auto justify-center whitespace-nowrap">
            <span className="material-symbols-outlined text-sm">add_circle</span>
            ADD NEW SKU
          </button>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-2xl border border-zinc-100 shadow-sm overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => setActiveTab("BB")}
          className={`flex-1 lg:flex-none px-4 lg:px-6 py-2 lg:py-3 rounded-xl text-[9px] lg:text-[10px] font-black tracking-widest transition-all uppercase whitespace-nowrap ${activeTab === "BB" ? "bg-zinc-900 text-white shadow-md" : "bg-transparent text-zinc-500 hover:bg-zinc-50"}`}
        >
          BAZAARBOLT ({products.filter(p => ((p as any).section || 'BB') === 'BB').length})
        </button>
        <button 
          onClick={() => setActiveTab("CAFE")}
          className={`flex-1 lg:flex-none px-4 lg:px-6 py-2 lg:py-3 rounded-xl text-[9px] lg:text-[10px] font-black tracking-widest transition-all uppercase whitespace-nowrap ${activeTab === "CAFE" ? "bg-zinc-900 text-white shadow-md" : "bg-transparent text-zinc-500 hover:bg-zinc-50"}`}
        >
          BB CAFE ({products.filter(p => (p as any).section === 'CAFE').length})
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 lg:gap-4">
        {paginatedProducts.map(p => (
          <div key={p.id} className={`bg-white rounded-2xl p-3 shadow-sm border transition-all group ${p.isBestseller ? 'border-orange-400 ring-2 ring-orange-400/10 shadow-orange-100' : 'border-zinc-100'}`}>
            <div className="aspect-square bg-zinc-50 rounded-xl mb-2 p-2 flex items-center justify-center border border-zinc-50 relative overflow-hidden">
              <img src={p.image} alt={p.name} className="w-16 h-16 lg:w-20 lg:h-20 object-contain group-hover:scale-110 transition-transform" />
              <div className="absolute top-1 right-1 flex flex-col gap-1 items-end">
                <span className={`px-1.5 py-0.5 rounded-md text-[6px] lg:text-[7px] font-black tracking-widest border ${p.active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                  {p.active ? 'LIVE' : 'HIDDEN'}
                </span>
              </div>
            </div>
            <h4 className="font-headline font-black text-[9px] lg:text-[10px] text-zinc-900 truncate mb-0.5 leading-tight">{p.name}</h4>
            <div className="flex flex-col gap-1 mb-1">
              <p className="text-[7px] lg:text-[8px] font-black text-zinc-400 tracking-widest uppercase">STOCK: {p.stock} • VENDOR: {p.vendorId ? 'ASSIGNED' : 'NONE'}</p>
              {p.lastUpdatedBy && <p className="text-[6px] lg:text-[7px] font-bold text-primary tracking-tighter italic">Last updated by {p.lastUpdatedBy}</p>}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-zinc-50 mt-1">
              <span className="font-headline font-black text-[10px] lg:text-xs text-zinc-900 tracking-tighter">₹{p.price.toFixed(0)}</span>
              <div className="flex gap-1 lg:gap-1.5">
                <button onClick={() => startEdit(p)} className="w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[12px] lg:text-[14px]">edit</span>
                </button>
                <button onClick={() => removeProduct(p.id)} className="w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 hover:text-red-500 transition-colors">
                  <span className="material-symbols-outlined text-[12px] lg:text-[14px]">delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {displayCount < filteredProducts.length && (
        <div className="flex justify-center pt-10">
          <button 
            onClick={() => setDisplayCount(prev => prev + 24)}
            className="bg-white border-2 border-zinc-900 text-zinc-900 px-10 py-4 rounded-3xl font-black text-[10px] tracking-widest hover:bg-zinc-900 hover:text-white transition-all shadow-xl active:scale-95 uppercase"
          >
            Load More Products ({filteredProducts.length - displayCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
