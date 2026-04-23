"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { collection, onSnapshot, query, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Category {
 id: string;
 label: string;
 img: string;
 active: boolean;
 order?: number;
 section?: "BB" | "CAFE";
}

const DEFAULTS = [
 { id: "Vegetables", label: "Vegetables", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA1pm_sqQ0qiiz-0usKkww7tzfuE_2w5YQ4xrZDn05NXFNpBAnOmHJx-ZRNWXz8g6IS0bIzUgc6x1lv_4MpxJv5JEeUPUAGpZPcVObQcN2L-5j1Cn7YHj3qhb-7rWampdIBsvVhEtcHKYJK1BTuSbQQDMV6PyHqc0XbrUqi8vgTiE9AhWz-vnz0o8aJvcC_S0AiGuyJF3oE6qO6HXiFEPAedxQ1BDhQ_IGyI8i99gXP-ZPxIx-fzJiZXooV_TA3Di2WOWPkmOBNwu3l", active: true, order: 0 },
 { id: "Dairy", label: "Dairy & Eggs", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA4HUAio5IxKiRkz2BPFOdq5RSda7eP-Up4srmVnb6-yzKn1_TxLNNpZFLvMIpr3F0Y53wDiVwEFCFpfv_xFh5JCHBXnBOcd-T3IwzD7tKQQTwGjnOXCW4eSr2Yj8w3xccNgMXef47LAGvh6tKKGHvBjhe0ua8Nj1IZh6RVmyIW5XpSuwOrM2JBuOQcQbeS7-rbVZ4YGmZRrVlkfbrKQvlGedCm-x6MixxoMpkOGY1Jk_wfHX14uuxJZX-cYdSdYJtTbzqrnGuhKHjL", active: true, order: 1 },
 { id: "Munchies", label: "Snacks & Munchies", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAEuxZomF5R1zlep_9fSSha0FOwl6UhU8XWOxlvg6p0w0xwsW3UXaRW24uDvjiW09bu_I-wyNMcCrjcLvg_347YBerqqSjHtlJ4O6IHlnbzewJY9UY2z_wM4VlJDQyuP6jK-fmnRTh7cBsfz8l9pGIc-rkCKDmgIhMTnigc-UQbbqqAT7ropeW0NOJZc9EKoMda3PqLyF7ux50ofRHNeQbCKTsotARx-RzQeq2BLPzglYUc_aLd_TKZtm7XMA3vWuLwz5ccubXV_O7b", active: true, order: 2 },
 { id: "Beverages", label: "Cold Drinks", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuACno2RBAW4V2OXESXUoPYdI8X_6Pocrfk2UNba5-X-bxLW20TumbjJBBM_H6WwnIjKo8C-DEyWRGlfmC5itzrvAg7b7qfEn6wnJjK9Lm3f_CWANjRqrBRcH6Tgl5viyFcIE0USY9H1Nd0BP3oyTOpy8ofAIELTxAZOj9JjcNIT5mzTVMmwQYwWv1l7Pcd0QIloPRc4kk0iEEOs4lPAK_pY1mapp13ObXv2rhJ9cbbzdQ5OWdZRUWbyqR5zJLLDKrol1B-Na6yQ6_s7", active: true, order: 3 },
];

export default function AdminCategories() {
 const [categories, setCategories] = useState<Category[]>([]);
 const [activeTab, setActiveTab] = useState<"BB" | "CAFE">("BB");
 const [loading, setLoading] = useState(true);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

 useEffect(() => {
 const q = query(collection(db, "categories"));
 const unsub = onSnapshot(q, (snap) => {
 const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
 items.sort((a, b) => (a.order || 0) - (b.order || 0));
 setCategories(items);
 setLoading(false);
 });
 return () => unsub();
 }, []);

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!editingCategory?.label || !editingCategory?.img) {
 toast.error("Please fill all fields");
 return;
 }

 const id = editingCategory.id || editingCategory.label.toLowerCase().replace(/\s+/g, '-');
 const categoryData = {
 label: editingCategory.label,
 img: editingCategory.img,
 active: editingCategory.active ?? true,
 order: editingCategory.order ?? categories.length,
 section: editingCategory.section || "BB",
 };

 try {
 await setDoc(doc(db, "categories", id), categoryData, { merge: true });
 toast.success(editingCategory.id ? "Category Updated": "Category Created");
 setIsModalOpen(false);
 setEditingCategory(null);
 } catch (error) {
 toast.error("Failed to save category");
 }
 };

 const toggleStatus = async (cat: Category) => {
 try {
 await updateDoc(doc(db, "categories", cat.id), { active: !cat.active });
 toast.success("Status updated");
 } catch (error) {
 toast.error("Update failed");
 }
 };

 const handleDelete = async (id: string) => {
 if (!confirm("Are you sure? This will remove the category listing.")) return;
 try {
 await deleteDoc(doc(db, "categories", id));
 toast.success("Category Deleted");
 } catch (error) {
 toast.error("Delete failed");
 }
 };

 const syncDefaults = async () => {
 const toastId = toast.loading("Syncing defaults...");
 try {
 for (const cat of DEFAULTS) {
 await setDoc(doc(db, "categories", cat.id), cat, { merge: true });
 }
 toast.success("Default Categories Restored", { id: toastId });
 } catch (error) {
 toast.error("Sync failed", { id: toastId });
 }
 };

 if (loading) return (
 <div className="flex items-center justify-center p-20">
 <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
 </div>
 );

 return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl lg:text-3xl font-headline font-black text-zinc-900 tracking-tight">Product Categories</h3>
          <p className="text-[10px] lg:text-xs font-bold text-zinc-400 tracking-widest mt-1 uppercase">Real-time category management</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <button onClick={syncDefaults}
            className="w-full sm:w-auto bg-white border border-zinc-200 text-zinc-400 px-6 py-3 lg:py-4 rounded-2xl font-black text-[9px] lg:text-[10px] tracking-widest hover:text-zinc-900 hover:border-zinc-900 transition-all"
          >
            Sync Defaults
          </button>
          <button onClick={() => { setEditingCategory({ section: activeTab }); setIsModalOpen(true); }}
            className="w-full sm:w-auto bg-zinc-900 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-2xl font-black text-[9px] lg:text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Category
          </button>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-2xl border border-zinc-100 shadow-sm overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => setActiveTab("BB")}
          className={`flex-1 lg:flex-none px-4 lg:px-6 py-2 lg:py-3 rounded-xl text-[9px] lg:text-[10px] font-black tracking-widest transition-all uppercase whitespace-nowrap ${activeTab === "BB" ? "bg-zinc-900 text-white shadow-md" : "bg-transparent text-zinc-500 hover:bg-zinc-50"}`}
        >
          BAZAARBOLT ({categories.filter(c => (c.section || "BB") === "BB").length})
        </button>
        <button 
          onClick={() => setActiveTab("CAFE")}
          className={`flex-1 lg:flex-none px-4 lg:px-6 py-2 lg:py-3 rounded-xl text-[9px] lg:text-[10px] font-black tracking-widest transition-all uppercase whitespace-nowrap ${activeTab === "CAFE" ? "bg-zinc-900 text-white shadow-md" : "bg-transparent text-zinc-500 hover:bg-zinc-50"}`}
        >
          BB CAFE ({categories.filter(c => c.section === "CAFE").length})
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        {categories.filter(c => (c.section || "BB") === activeTab).map((cat) => (
          <div key={cat.id} className={`bg-white rounded-[28px] lg:rounded-[32px] p-5 lg:p-6 shadow-sm border border-zinc-200 group hover:shadow-2xl hover:border-primary/20 transition-all flex flex-col ${!cat.active ? 'opacity-60 bg-zinc-50': ''}`}>
            <div className="flex items-center gap-4 lg:gap-5 mb-4 lg:mb-6">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-zinc-50 rounded-2xl p-3 border border-zinc-100 flex items-center justify-center group-hover:bg-primary/5 transition-colors relative overflow-hidden flex-shrink-0">
                <img src={cat.img} alt={cat.label} className="w-full h-full object-contain"/>
                {!cat.active && (
                  <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center backdrop-blur-[2px]">
                    <span className="material-symbols-outlined text-red-500 font-black">visibility_off</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-headline font-black text-zinc-900 text-base lg:text-lg leading-tight tracking-tight truncate">{cat.label}</h4>
                <div className={`mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[7px] lg:text-[8px] font-black tracking-widest uppercase ${cat.active ? 'bg-green-100 text-green-700': 'bg-red-100 text-red-700'}`}>
                  <div className={`w-1 h-1 rounded-full ${cat.active ? 'bg-green-600': 'bg-red-600'}`}></div>
                  {cat.active ? 'Live': 'Hidden'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-auto pt-4 lg:pt-6 border-t border-zinc-50">
              <button onClick={() => { setEditingCategory(cat); setIsModalOpen(true); }}
                className="flex-1 h-10 lg:h-12 rounded-xl text-[9px] lg:text-[10px] font-black tracking-widest border border-zinc-100 text-zinc-400 hover:text-zinc-900 hover:border-zinc-900 transition-all flex items-center justify-center gap-2 uppercase"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                Edit
              </button>
              <button onClick={() => handleDelete(cat.id)}
                className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 flex items-center justify-center transition-all"
              >
                <span className="material-symbols-outlined text-base lg:text-xl">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-zinc-950/40 backdrop-blur-md flex items-center justify-center p-4 lg:p-12 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[32px] lg:rounded-[48px] p-6 lg:p-12 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6 lg:mb-8">
              <div>
                <h2 className="text-2xl lg:text-4xl font-headline font-black text-zinc-900 tracking-tighter ">{editingCategory?.id ? 'Edit Category': 'New Category'}</h2>
                <p className="text-[10px] font-black text-zinc-400 tracking-widest mt-1 uppercase">Configure display properties</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6 lg:space-y-8">
              <div className="grid grid-cols-1 gap-4 lg:gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 ml-1 block uppercase">Full Label</label>
                  <input type="text" placeholder="e.g. Dairy & Eggs" className="w-full bg-zinc-50 border-none rounded-2xl lg:rounded-3xl p-4 lg:p-5 font-black text-sm focus:ring-4 ring-primary/20 transition-all"
                    value={editingCategory?.label || ""}
                    onChange={e => setEditingCategory(prev => ({...prev, label: e.target.value}))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 ml-1 block uppercase">Icon URL</label>
                  <input type="text" placeholder="https://..." className="w-full bg-zinc-50 border-none rounded-2xl lg:rounded-3xl p-4 lg:p-5 font-black text-[10px] lg:text-[11px] focus:ring-4 ring-primary/20 transition-all text-zinc-500"
                    value={editingCategory?.img || ""}
                    onChange={e => setEditingCategory(prev => ({...prev, img: e.target.value}))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 ml-1 block uppercase">Order</label>
                    <input type="number" className="w-full bg-zinc-50 border-none rounded-2xl lg:rounded-3xl p-4 lg:p-5 font-black text-sm focus:ring-4 ring-primary/20 transition-all"
                      value={editingCategory?.order ?? 0}
                      onChange={e => setEditingCategory(prev => ({...prev, order: parseInt(e.target.value)}))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] lg:text-[10px] font-black tracking-widest text-zinc-400 ml-1 block uppercase">Status</label>
                    <button type="button"
                      onClick={() => setEditingCategory(prev => ({...prev, active: !prev?.active}))}
                      className={`w-full h-[54px] lg:h-[60px] rounded-2xl lg:rounded-3xl font-black text-[9px] lg:text-[10px] tracking-widest transition-all ${editingCategory?.active !== false ? 'bg-green-50 text-green-600 border-2 border-green-100': 'bg-red-50 text-red-600 border-2 border-red-100'}`}
                    >
                      {editingCategory?.active !== false ? 'Active': 'Hidden'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4 lg:pt-6">
                <button type="submit"
                  className="w-full bg-zinc-900 text-white h-14 lg:h-16 rounded-2xl lg:rounded-[24px] font-black tracking-widest text-xs hover:bg-black transition-all shadow-xl"
                >
                  {editingCategory?.id ? 'Update Records': 'Save Category'}
                </button>
                <button type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full h-10 lg:h-16 rounded-2xl lg:rounded-[24px] font-black tracking-widest text-[9px] lg:text-[10px] text-zinc-400 hover:text-zinc-900 transition-all uppercase"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
 </div>
 );
}
