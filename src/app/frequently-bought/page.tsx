"use client";

import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Product } from "@/types";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function OrderAgainPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, addToCart, updateQuantity } = useStore();
  const [frequentProducts, setFrequentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFrequentItems() {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        // In a real app, we'd query previous orders and count frequency.
        // For now, let's just get the most recent products from orders.
        const q = query(collection(db, "orders"), where("userId", "==", user.uid), limit(5));
        const querySnapshot = await getDocs(q);
        const productMap = new Map<string, any>();
        
        querySnapshot.forEach(doc => {
          const items = doc.data().items || [];
          items.forEach((item: any) => {
             productMap.set(item.id, item);
          });
        });

        const products = Array.from(productMap.values());
        
        if (products.length === 0) {
           // Fallback to bestsellers if no order history
           const bestQ = query(collection(db, "products"), limit(6));
           const bestSnap = await getDocs(bestQ);
           const bestProds: any[] = [];
           bestSnap.forEach(d => bestProds.push({id: d.id, ...d.data()}));
           setFrequentProducts(bestProds);
        } else {
           setFrequentProducts(products);
        }
      } catch (error) {
        console.error("Error fetching frequent items:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchFrequentItems();
  }, [user]);

  return (
    <main className="min-h-screen bg-zinc-50 pb-32">
       {/* Header */}
       <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-2xl shadow-sm pt-safe">
         <div className="flex items-center px-4 py-4 w-full max-w-3xl mx-auto gap-4">
           <button onClick={() => router.back()} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
              <span className="material-symbols-outlined text-zinc-900 font-bold">arrow_back</span>
           </button>
           <div className="flex flex-col">
              <h1 className="text-xl font-headline font-black text-zinc-900 tracking-tight leading-none">Order Again</h1>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Based on your history</span>
           </div>
         </div>
       </header>

       <div className="pt-24 px-5 max-w-3xl mx-auto">
          {loading ? (
             <div className="grid grid-cols-2 gap-4">
                {[1,2,3,4].map(n => <div key={n} className="h-48 bg-white rounded-3xl animate-pulse" />)}
             </div>
          ) : frequentProducts.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-[32px] border border-zinc-100">
                <span className="material-symbols-outlined text-6xl text-zinc-200 mb-4" style={{fontVariationSettings: "'FILL' 1"}}>history</span>
                <p className="font-headline font-black text-zinc-400 uppercase tracking-widest text-xs">No order history found</p>
                <button onClick={() => router.push("/")} className="mt-6 bg-zinc-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Start Shopping</button>
             </div>
          ) : (
             <div className="grid grid-cols-2 gap-4">
                {frequentProducts.map((product) => {
                   const cartItem = cart.find(c => c.id === product.id);
                   return (
                      <div key={product.id} className="bg-white rounded-[32px] p-4 flex flex-col shadow-sm border border-zinc-100 group transition-all hover:shadow-md">
                         <div className="aspect-square bg-zinc-50 rounded-2xl mb-4 p-4 flex items-center justify-center overflow-hidden border border-zinc-100 relative">
                            <img src={product.image} alt={product.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                            <div className="absolute top-2 right-2 bg-yellow-400 text-zinc-900 text-[8px] font-black px-2 py-1 rounded-full shadow-sm uppercase tracking-tighter">Frequently Bought</div>
                         </div>
                         <h3 className="font-headline font-black text-sm text-zinc-900 truncate mb-1">{product.name}</h3>
                         <div className="flex items-center justify-between mt-auto">
                            <span className="font-headline font-black text-lg text-zinc-900 tracking-tighter">₹{product.price.toFixed(2)}</span>
                            
                            {!cartItem ? (
                               <button 
                                 onClick={() => addToCart({...product, quantity: 1})}
                                 className="w-10 h-10 bg-zinc-900 hover:bg-black text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all"
                               >
                                 <span className="material-symbols-outlined text-xl">add</span>
                               </button>
                            ) : (
                               <div className="flex items-center bg-primary rounded-xl px-1 py-1 h-10 shadow-sm border border-white/20">
                                 <button onClick={() => updateQuantity(product.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-black/10 rounded-lg transition-all active:scale-90">
                                   <span className="material-symbols-outlined text-sm font-black text-white">remove</span>
                                 </button>
                                 <span className="w-6 text-center font-headline font-black text-xs text-white">{cartItem.quantity}</span>
                                 <button onClick={() => updateQuantity(product.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-black/10 rounded-lg transition-all active:scale-90">
                                   <span className="material-symbols-outlined text-sm font-black text-white">add</span>
                                 </button>
                               </div>
                            )}
                         </div>
                      </div>
                   )
                })}
             </div>
          )}
       </div>

       {/* Floating Curved NavBar */}
       <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] z-50 bg-white/95 backdrop-blur-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] border border-white/40 rounded-full px-6 py-3 flex justify-between items-center transition-all">
          <button onClick={() => router.push("/")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-all">
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">home</span>
            <span className="font-headline text-[9px] font-black uppercase tracking-widest mt-1 text-zinc-400 group-hover:text-zinc-900">Home</span>
          </button>
          
          <button onClick={() => {}} className="flex flex-col items-center justify-center text-zinc-900 group active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform" style={{fontVariationSettings: "'FILL' 1"}}>history</span>
            <span className="font-headline text-[9px] font-black uppercase tracking-widest mt-1 text-zinc-900 font-black">Order Again</span>
          </button>
          
          <button onClick={() => router.push("/help")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-all">
            <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">support_agent</span>
            <span className="font-headline text-[9px] font-black uppercase tracking-widest mt-1 text-zinc-400 group-hover:text-zinc-900">Support</span>
          </button>

          <button onClick={() => router.push("/cart")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-transform relative">
            <div className="relative">
              <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform">shopping_bag</span>
              {cart.length > 0 && (
                <div className="absolute -top-2 -right-3 bg-primary text-zinc-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center pointer-events-none shadow-sm shadow-primary/40 border-[1.5px] border-white">
                  {cart.length}
                </div>
              )}
            </div>
            <span className="font-headline text-[9px] font-black uppercase tracking-widest mt-1 text-zinc-400 group-hover:text-zinc-900">Cart</span>
          </button>
      </nav>
    </main>
  );
}
