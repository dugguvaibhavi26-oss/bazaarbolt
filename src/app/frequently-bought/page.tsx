"use client";

import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Product } from "@/types";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { BottomNav } from "@/components/BottomNav";

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
    <main className="min-h-screen bg-zinc-50 pb-44 uppercase">
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-2xl shadow-sm pt-safe uppercase">
        <div className="flex items-center px-4 py-4 w-full max-w-3xl mx-auto gap-4 uppercase">
          <button onClick={() => router.back()} className="p-2 hover:bg-zinc-100 rounded-full transition-colors uppercase">
            <span className="material-symbols-outlined text-zinc-900 font-bold uppercase">arrow_back</span>
          </button>
          <div className="flex flex-col uppercase">
            <h1 className="text-xl font-headline font-black text-zinc-900 tracking-tight leading-none uppercase">Order Again</h1>
            <span className="text-[10px] font-bold text-zinc-400 tracking-widest mt-1 uppercase">Based on your history</span>
          </div>
        </div>
      </header>

      <div className="pt-24 px-5 max-w-3xl mx-auto uppercase">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 uppercase">
            {[1,2,3,4].map(n => <div key={n} className="h-48 bg-white rounded-3xl animate-pulse uppercase"/>)}
          </div>
        ) : frequentProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[32px] border border-zinc-100 uppercase">
            <span className="material-symbols-outlined text-6xl text-zinc-200 mb-4 uppercase" style={{fontVariationSettings: "'FILL'1"}}>history</span>
            <p className="font-headline font-black text-zinc-400 tracking-widest text-xs uppercase">No order history found</p>
            <button onClick={() => router.push("/")} className="mt-6 bg-zinc-900 text-white px-8 py-3 rounded-2xl font-black text-xs tracking-widest shadow-lg uppercase">Start Shopping</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 uppercase">
            {frequentProducts.map((product) => {
              const cartItem = cart.find(c => c.id === product.id);
              return (
                <div key={product.id} className="bg-white rounded-[32px] p-4 flex flex-col shadow-sm border border-zinc-100 group transition-all hover:shadow-md uppercase">
                  <div className="aspect-square bg-zinc-50 rounded-2xl mb-4 p-4 flex items-center justify-center overflow-hidden border border-zinc-100 relative uppercase">
                    <img src={product.image} alt={product.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform uppercase"/>
                    <div className="absolute top-2 right-2 bg-yellow-400 text-zinc-900 text-[8px] font-black px-2 py-1 rounded-full shadow-sm tracking-tighter uppercase">Frequent</div>
                  </div>
                  <h3 className="font-headline font-black text-[10px] text-zinc-900 truncate mb-1 uppercase leading-tight">{product.name}</h3>
                  <div className="flex items-center justify-between mt-auto uppercase">
                    <span className="font-headline font-black text-base text-zinc-900 tracking-tighter uppercase">₹{product.price.toFixed(0)}</span>
                    {!cartItem ? (
                      <button onClick={() => addToCart({...product, quantity: 1})}
                        className="w-10 h-10 bg-zinc-900 hover:bg-black text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all font-black text-[10px] uppercase"
                      >
                        <span className="material-symbols-outlined text-xl uppercase">add</span>
                      </button>
                    ) : (
                      <div className="flex items-center bg-primary rounded-xl px-1 py-1 h-10 shadow-sm border border-white/20 uppercase">
                        <button onClick={() => updateQuantity(product.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-black/10 rounded-lg transition-all active:scale-90 uppercase">
                          <span className="material-symbols-outlined text-sm font-black text-zinc-900 uppercase">remove</span>
                        </button>
                        <span className="w-6 text-center font-headline font-black text-xs text-zinc-900 uppercase">{cartItem.quantity}</span>
                        <button onClick={() => updateQuantity(product.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-black/10 rounded-lg transition-all active:scale-90 uppercase">
                          <span className="material-symbols-outlined text-sm font-black text-zinc-900 uppercase">add</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </main>
  );
}
