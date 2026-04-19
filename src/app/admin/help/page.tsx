"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

export default function AdminHelp() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [formData, setFormData] = useState({ q: "", a: "", order: 0 });

  useEffect(() => {
    const q = query(collection(db, "faqs"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setFaqs(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.q || !formData.a) return;

    try {
      if (editingFaq) {
        await updateDoc(doc(db, "faqs", editingFaq.id), formData);
        toast.success("Updated FAQ");
      } else {
        await addDoc(collection(db, "faqs"), formData);
        toast.success("Added new FAQ");
      }
      setIsAdding(false);
      setEditingFaq(null);
      setFormData({ q: "", a: "", order: 0 });
    } catch (e) {
      toast.error("Process failed");
    }
  };

  const startEdit = (faq: any) => {
    setEditingFaq(faq);
    setFormData({ q: faq.q, a: faq.a, order: faq.order || 0 });
    setIsAdding(true);
  };

  if (loading) return <div className="p-10 animate-pulse bg-white rounded-3xl h-96" />;

  return (
    <div className="space-y-10 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Help Desk FAQs</h3>
          <p className="text-xs font-bold text-zinc-400 tracking-widest mt-1">Manage common support questions</p>
        </div>
        <button onClick={() => { setEditingFaq(null); setFormData({ q: "", a: "", order: 0 }); setIsAdding(true); }} 
          className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest flex items-center gap-2 hover:bg-black shadow-xl transition-all">
          <span className="material-symbols-outlined text-sm">add_circle</span>
          Add new FAQ
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {faqs.map(faq => (
          <div key={faq.id} className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start">
            <div className="flex-1">
              <h4 className="font-headline font-black text-zinc-900 mb-2">{faq.q}</h4>
              <p className="text-zinc-500 text-sm">{faq.a}</p>
              <div className="mt-3 flex gap-2">
                 <span className="bg-zinc-100 px-2 py-1 rounded-md text-[8px] font-black text-zinc-400">ORDER: {faq.order || 0}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => startEdit(faq)}
                className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-primary transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-xl">edit</span>
              </button>
              <button 
                onClick={() => confirm("Delete this FAQ?") && deleteDoc(doc(db, "faqs", faq.id))}
                className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[100] bg-zinc-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl relative">
            <h2 className="text-2xl font-headline font-black text-zinc-900 tracking-tight mb-8">
              {editingFaq ? 'Edit FAQ' : 'New FAQ'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-2 block">Question</label>
                <input 
                  type="text" 
                  value={formData.q} 
                  onChange={e => setFormData({...formData, q: e.target.value})}
                  className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all outline-none"
                  placeholder="e.g. How to track my order?"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-2 block">Answer</label>
                <textarea 
                  rows={4}
                  value={formData.a} 
                  onChange={e => setFormData({...formData, a: e.target.value})}
                  className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all outline-none resize-none"
                  placeholder="Enter detailed answer here..."
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 mb-2 block">Display Order (optional)</label>
                <input 
                  type="number" 
                  value={formData.order} 
                  onChange={e => setFormData({...formData, order: parseInt(e.target.value)})}
                  className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-2 ring-primary transition-all outline-none"
                />
              </div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-zinc-100 text-zinc-500 py-4 rounded-2xl font-black tracking-widest text-[10px] transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-black tracking-widest text-[10px] transition-all hover:bg-black shadow-xl">{editingFaq ? 'Update' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
