"use client";

import { useState } from "react";
import toast from "react-hot-toast";

// Static categories as defined in customer app, but admin should be able to see/manage
const INITIAL_CATEGORIES = [
  { id: "Vegetables", label: "Vegetables", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA1pm_sqQ0qiiz-0usKkww7tzfuE_2w5YQ4xrZDn05NXFNpBAnOmHJx-ZRNWXz8g6IS0bIzUgc6x1lv_4MpxJv5JEeUPUAGpZPcVObQcN2L-5j1Cn7YHj3qhb-7rWampdIBsvVhEtcHKYJK1BTuSbQQDMV6PyHqc0XbrUqi8vgTiE9AhWz-vnz0o8aJvcC_S0AiGuyJF3oE6qO6HXiFEPAedxQ1BDhQ_IGyI8i99gXP-ZPxIx-fzJiZXooV_TA3Di2WOWPkmOBNwu3l", active: true },
  { id: "Dairy", label: "Dairy & Eggs", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA4HUAio5IxKiRkz2BPFOdq5RSda7eP-Up4srmVnb6-yzKn1_TxLNNpZFLvMIpr3F0Y53wDiVwEFCFpfv_xFh5JCHBXnBOcd-T3IwzD7tKQQTwGjnOXCW4eSr2Yj8w3xccNgMXef47LAGvh6tKKGHvBjhe0ua8Nj1IZh6RVmyIW5XpSuwOrM2JBuOQcQbeS7-rbVZ4YGmZRrVlkfbrKQvlGedCm-x6MixxoMpkOGY1Jk_wfHX14uuxJZX-cYdSdYJtTbzqrnGuhKHjL", active: true },
  { id: "Munchies", label: "Snacks & Munchies", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAEuxZomF5R1zlep_9fSSha0FOwl6UhU8XWOxlvg6p0w0xwsW3UXaRW24uDvjiW09bu_I-wyNMcCrjcLvg_347YBerqqSjHtlJ4O6IHlnbzewJY9UY2z_wM4VlJDQyuP6jK-fmnRTh7cBsfz8l9pGIc-rkCKDmgIhMTnigc-UQbbqqAT7ropeW0NOJZc9EKoMda3PqLyF7ux50ofRHNeQbCKTsotARx-RzQeq2BLPzglYUc_aLd_TKZtm7XMA3vWuLwz5ccubXV_O7b", active: true },
  { id: "Beverages", label: "Cold Drinks", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuACno2RBAW4V2OXESXUoPYdI8X_6Pocrfk2UNba5-X-bxLW20TumbjJBBM_H6WwnIjKo8C-DEyWRGlfmC5itzrvAg7b7qfEn6wnJjK9Lm3f_CWANjRqrBRcH6Tgl5viyFcIE0USY9H1Nd0BP3oyTOpy8ofAIELTxAZOj9JjcNIT5mzTVMmwQYwWv1l7Pcd0QIloPRc4kk0iEEOs4lPAK_pY1mapp13ObXv2rhJ9cbbzdQ5OWdZRUWbyqR5zJLLDKrol1B-Na6yQ6_s7", active: true },
];

export default function AdminCategories() {
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [isAdding, setIsAdding] = useState(false);

  const toggleStatus = (id: string) => {
     setCategories(prev => prev.map(c => c.id === id ? {...c, active: !c.active} : c));
     toast.success("Category status updated");
  };

  return (
    <div className="space-y-8">
       <div className="flex items-center justify-between">
          <div>
             <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Product Categories</h3>
             <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Manage what customers see on home page</p>
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-zinc-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95">
             <span className="material-symbols-outlined text-sm">add</span>
             Add New Category
          </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {categories.map((cat) => (
             <div key={cat.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-zinc-200 group hover:shadow-xl hover:border-primary/20 transition-all">
                <div className="flex items-center gap-5 mb-6">
                   <div className="w-16 h-16 bg-zinc-50 rounded-2xl p-3 border border-zinc-100 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                      <img src={cat.img} alt={cat.label} className="w-full h-full object-contain" />
                   </div>
                   <div className="flex-1">
                      <h4 className="font-headline font-black text-zinc-900 leading-tight">{cat.label}</h4>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">ID: {cat.id}</p>
                   </div>
                   <div className={`w-3 h-3 rounded-full ${cat.active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-zinc-50">
                   <button className="text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-900 transition-colors tracking-widest">Edit Details</button>
                   <button 
                     onClick={() => toggleStatus(cat.id)}
                     className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cat.active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                   >
                      {cat.active ? 'Disable' : 'Enable'}
                   </button>
                </div>
             </div>
          ))}
       </div>

       {isAdding && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl">
                <h2 className="text-3xl font-headline font-black text-zinc-900 mb-8 tracking-tight">Add Category</h2>
                <div className="space-y-6">
                   <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1 mb-2 block">Category Name</label>
                      <input type="text" placeholder="e.g. Frozen Foods" className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all" />
                   </div>
                   <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1 mb-2 block">Icon URL (PNG transparent)</label>
                      <input type="text" placeholder="https://..." className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all" />
                   </div>
                   <div className="flex gap-4 pt-4">
                      <button onClick={() => setIsAdding(false)} className="flex-1 bg-zinc-100 text-zinc-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]">Cancel</button>
                      <button onClick={() => {setIsAdding(false); toast.success("Added New Category")}} className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]">Create Category</button>
                   </div>
                </div>
             </div>
          </div>
       )}
    </div>
  );
}
