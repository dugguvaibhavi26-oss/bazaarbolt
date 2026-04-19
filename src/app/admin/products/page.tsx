"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Product } from "@/types";
import { mapProduct, mapQuerySnapshot } from "@/lib/mappers";
import toast from "react-hot-toast";
import { downloadTemplate, parseFile, validateProducts } from "@/lib/bulkUploadUtils";
import { triggerNotification } from "@/lib/notificationClient";

export default function AdminProducts() {
 const [products, setProducts] = useState<Product[]>([]);
 const [loading, setLoading] = useState(true);
 const [categories, setCategories] = useState<any[]>([]);
 const [isAdding, setIsAdding] = useState(false);
 const [newProduct, setNewProduct] = useState({
 name: "",
 price: 0,
 image: "",
 category: "",
 description: "",
 stock: 100,
 active: true
 });

 const [uploadMode, setUploadMode] = useState<"manual"| "bulk">("manual");
 const [uploadFile, setUploadFile] = useState<File | null>(null);
 const [previewData, setPreviewData] = useState<Partial<Product>[]>([]);
 const [isUploading, setIsUploading] = useState(false);
 const [uploadStats, setUploadStats] = useState({ total: 0, valid: 0, failed: 0 });

 useEffect(() => {
 const unsubProds = onSnapshot(collection(db, "products"), (snap) => {
 try {
 const prods = mapQuerySnapshot(snap, mapProduct).filter(p => !p.isDeleted);
 setProducts(prods);
 } catch (e) {
 console.error("Mapping error in AdminProducts:", e);
 toast.error("Error loading inventory data");
 }
 setLoading(false);
 });

 const unsubCats = onSnapshot(collection(db, "categories"), (snap) => {
 const cats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
 setCategories(cats);
 if (cats.length > 0 && !newProduct.category) {
 setNewProduct(prev => ({ ...prev, category: cats[0].id }));
 }
 });

 return () => { unsubProds(); unsubCats(); };
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
 // Notify customers
 triggerNotification({
 topic: "customers",
 title: "New Product Available! 🛒",
 body:`Freshly added: ${newProduct.name}. Shop now!`,
 });

 setNewProduct({ name: "", price: 0, image: "", category: categories[0]?.id || "", description: "", stock: 100, active: true });
 setIsAdding(false);
 toast.success("Added to inventory", { id: toastId });
 } catch (err) {
 toast.error("Failed to add", { id: toastId });
 }
 };

 const toggleActive = async (id: string, current: boolean) => {
 try {
 await updateDoc(doc(db, "products", id), { active: !current });
 toast.success(current ? "Hidden from store": "Live on store");
 } catch(e) { toast.error("Update failed"); }
 };

 const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 setUploadFile(file);
 try {
 const rawData = await parseFile(file);
 const { valid, invalid } = validateProducts(rawData);
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
 const idToken = await user.getIdToken(true); // Force refresh token
 const resp = await fetch("/api/admin/products/bulk-upload", {
 method: "POST",
 body: JSON.stringify({ products: previewData }),
 headers: { "Content-Type": "application/json",
 "Authorization":`Bearer ${idToken}`
 }
 });

 if (!resp.ok) {
 const errorData = await resp.json().catch(() => ({}));
 throw new Error(errorData.error ||`Server responded with ${resp.status}`);
 }

 const data = await resp.json();
 if (data.success) {
 toast.success(`Successfully uploaded ${data.count} products`, { id: tid });
 // Notify customers about multiple new arrivals
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
 <div className="h-10 w-48 bg-white rounded-xl"/>
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
 {[1,2,3,4].map(n => <div key={n} className="h-40 bg-white rounded-3xl"/>)}
 </div>
 </div>
 );

 return (
 <div className="space-y-10 pb-32">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Inventory Control</h3>
 <p className="text-xs font-bold text-zinc-400 tracking-widest mt-1">Total SKU Count: {products.length}</p>
 </div>
 <button onClick={() => setIsAdding(true)} className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center gap-2 hover:bg-black shadow-xl active:scale-95 transition-all">
 <span className="material-symbols-outlined text-sm">inventory</span>
 Add New SKU
 </button>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
 {products.map(p => (
 <div key={p.id} className="bg-white rounded-2xl p-3 shadow-sm border border-zinc-100 group transition-all">
 <div className="aspect-square bg-zinc-50 rounded-xl mb-2 p-2 flex items-center justify-center border border-zinc-50 relative overflow-hidden">
 <img src={p.image} alt={p.name} className="w-20 h-20 object-contain group-hover:scale-110 transition-transform"/>
 <div className="absolute top-1 right-1 flex flex-col gap-1 items-end">
 <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-black tracking-widest border ${p.active ? 'bg-green-50 text-green-600 border-green-100': 'bg-red-50 text-red-600 border-red-100'}`}>
 {p.active ? 'LIVE': 'HIDDEN'}
 </span>
 </div>
 </div>
 <h4 className="font-headline font-black text-[10px] text-zinc-900 truncate mb-0.5 leading-tight">{p.name}</h4>
 <p className="text-[7px] font-black text-zinc-400 tracking-[0.1em] mb-3">{p.category}</p>
 <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
 <span className="font-headline font-black text-xs text-zinc-900 tracking-tighter">₹{p.price.toFixed(0)}</span>
 <div className="flex gap-1.5">
 <button onClick={() => toggleActive(p.id, p.active)} className="w-6 h-6 flex items-center justify-center rounded-lg bg-zinc-50 text-zinc-400 hover:text-zinc-900 transition-colors">
 <span className="material-symbols-outlined text-[14px]">{p.active ? 'visibility_off': 'visibility'}</span>
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
 <div className="flex gap-1 mt-2">
 <button onClick={() => setUploadMode("manual")}
 className={`px-3 py-1 rounded-full text-[8px] font-black tracking-widest transition-all ${uploadMode === 'manual'? 'bg-zinc-900 text-white': 'bg-zinc-100 text-zinc-400'}`}
 >
 Manual Entry
 </button>
 <button onClick={() => setUploadMode("bulk")}
 className={`px-3 py-1 rounded-full text-[8px] font-black tracking-widest transition-all ${uploadMode === 'bulk'? 'bg-zinc-900 text-white': 'bg-zinc-100 text-zinc-400'}`}
 >
 Bulk Upload
 </button>
 </div>
 </div>

 </div>

 {uploadMode === "manual"? (
 <form onSubmit={handleAdd} className="space-y-6">
 <div className="grid grid-cols-2 gap-6">
 <div className="col-span-2">
 <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-2 block">Product Name</label>
 <input type="text"required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all"/>
 </div>
 <div>
 <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-2 block">Category</label>
 <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all">
 {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
 </select>
 </div>
 <div>
 <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-2 block">Price (₹)</label>
 <input type="number"required value={newProduct.price || ""} onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})} className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all"/>
 </div>
 <div>
 <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-2 block">Opening Stock</label>
 <input type="number"required value={newProduct.stock || ""} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all"/>
 </div>
 <div className="col-span-2">
 <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-2 block">Image URL</label>
 <input type="text"required value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all"/>
 </div>
 <div className="col-span-2">
 <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-2 block">Product Description</label>
 <textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} rows={3}
 className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all resize-none"
 placeholder="Enter product highlights, usage, etc."
 />
 </div>
 </div>
 <div className="flex gap-4 pt-6">
 <button type="button"onClick={() => setIsAdding(false)} className="flex-1 bg-zinc-100 text-zinc-500 py-5 rounded-3xl font-black tracking-widest text-[10px] transition-all hover:bg-zinc-200">Cancel</button>
 <button type="submit"className="flex-1 bg-zinc-900 text-white py-5 rounded-3xl font-black tracking-widest text-[10px] transition-all hover:bg-black shadow-xl shadow-zinc-900/10">Add SKU</button>
 </div>
 </form>
 ) : (
 <div className="space-y-6">
 <div className="p-8 border-2 border-dashed border-zinc-200 rounded-[32px] bg-zinc-50 flex flex-col items-center justify-center text-center group hover:border-primary transition-all relative cursor-pointer">
 <input type="file"accept=".csv, .xlsx, .xls"onChange={onFileChange}
 className="absolute inset-0 opacity-0 cursor-pointer"
 />
 <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-4">
 <span className="material-symbols-outlined text-zinc-400 text-3xl group-hover:text-primary transition-colors">upload_file</span>
 </div>
 <h4 className="text-sm font-black text-zinc-900 mb-1">
 {uploadFile ? uploadFile.name : "Drop your file here or click to upload"}
 </h4>
 <p className="text-[10px] font-black text-zinc-400 tracking-widest">Supports CSV and Excel files</p>
 </div>

 <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
 <span className="material-symbols-outlined text-sm">description</span>
 </div>
 <div>
 <p className="text-[10px] font-black text-zinc-900 ">Need a template?</p>
 <p className="text-[8px] font-bold text-zinc-400">Download our formatted CSV template</p>
 </div>
 </div>
 <button type="button"
 onClick={downloadTemplate}
 className="bg-white border border-zinc-200 px-4 py-2 rounded-xl text-[8px] font-black tracking-widest hover:bg-zinc-50 transition-all flex items-center gap-2"
 >
 <span className="material-symbols-outlined text-[10px]">download</span>
 Download
 </button>
 </div>

 {previewData.length > 0 && (
 <div className="space-y-3">
 <div className="flex items-center justify-between px-1">
 <span className="text-[10px] font-black tracking-widest text-zinc-400">Preview ({previewData.length} valid rows)</span>
 {uploadStats.failed > 0 && (
 <span className="text-[10px] font-black tracking-widest text-red-500">{uploadStats.failed} invalid rows skipped</span>
 )}
 </div>
 <div className="bg-zinc-50 rounded-2xl overflow-hidden border border-zinc-100 max-h-[180px] overflow-y-auto">
 <table className="w-full text-left border-collapse">
 <thead className="bg-zinc-100 sticky top-0">
 <tr>
 <th className="p-3 text-[8px] font-black tracking-widest text-zinc-500">Product</th>
 <th className="p-3 text-[8px] font-black tracking-widest text-zinc-500">Category</th>
 <th className="p-3 text-[8px] font-black tracking-widest text-zinc-500 text-right">Price</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-zinc-100">
 {previewData.slice(0, 5).map((p, i) => (
 <tr key={i} className="hover:bg-zinc-100/50">
 <td className="p-3">
 <div className="flex items-center gap-2">
 <img src={p.image} className="w-6 h-6 rounded bg-white object-contain border border-zinc-100"/>
 <span className="text-[10px] font-bold text-zinc-900 truncate max-w-[120px]">{p.name}</span>
 </div>
 </td>
 <td className="p-3">
 <span className="text-[8px] font-black text-zinc-500 ">{p.category}</span>
 </td>
 <td className="p-3 text-right">
 <span className="text-[10px] font-black text-zinc-900 tracking-tighter">₹{p.price}</span>
 </td>
 </tr>
 ))}
 {previewData.length > 5 && (
 <tr>
 <td colSpan={3} className="p-2 text-center text-[8px] font-black text-zinc-400 tracking-widest">
 + {previewData.length - 5} more products
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 )}

 <div className="flex gap-4 pt-6">
 <button type="button"onClick={() => {
 setIsAdding(false);
 setUploadFile(null);
 setPreviewData([]);
 }} className="flex-1 bg-zinc-100 text-zinc-500 py-5 rounded-3xl font-black tracking-widest text-[10px] transition-all hover:bg-zinc-200"
 >
 Cancel
 </button>
 <button type="button"
 onClick={handleBulkUpload}
 disabled={previewData.length === 0 || isUploading}
 className={`flex-1 py-5 rounded-3xl font-black tracking-widest text-[10px] transition-all shadow-xl shadow-zinc-900/10 flex items-center justify-center gap-2
 ${previewData.length === 0 || isUploading ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed': 'bg-zinc-900 text-white hover:bg-black'}
`}
 >
 {isUploading ? (
 <>
 <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
 Uploading...
 </>
 ) : (
 <>
 <span className="material-symbols-outlined text-[14px]">cloud_upload</span>
 Upload {previewData.length} Products
 </>
 )}
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 );
}
