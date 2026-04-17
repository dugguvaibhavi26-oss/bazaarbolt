"use client";

import { useStore } from "@/store/useStore";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/types";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function CategoryPage() {
  const { id } = useParams();
  const router = useRouter();
  const { cart, addToCart, updateQuantity } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const decodedId = decodeURIComponent(id as string);
    const q = query(collection(db, "products"), where("category", "==", decodedId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.isDeleted && data.active) {
          prods.push({ id: doc.id, ...data } as Product);
        }
      });
      setProducts(prods);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  const ProductCard = ({ product }: { product: Product }) => {
    const cartItem = cart.find(c => c.id === product.id);
    const outOfStock = product.stock <= 0;

    return (
      <div className={`flex flex-col gap-1.5 transition-all group ${outOfStock ? 'opacity-60 grayscale' : ''}`}>
        {/* Image Area */}
        <div className="relative aspect-square bg-[#F3F4F6] rounded-2xl overflow-hidden border border-zinc-100 cursor-pointer" onClick={() => router.push(`/product/${product.id}`)}>
          <img className="w-full h-full p-2 object-contain group-hover:scale-105 transition-transform duration-500" src={product.image} alt={product.name} />
          
          {/* Floating ADD button */}
          <div className="absolute bottom-1 right-1">
            {!cartItem ? (
              <button
                disabled={outOfStock}
                onClick={(e) => { e.stopPropagation(); addToCart({ ...product, quantity: 1 }); }}
                className="bg-white border-[1.5px] border-green-600 text-green-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-lg active:scale-90 transition-all"
              >
                ADD
              </button>
            ) : (
              <div className="flex items-center bg-green-600 text-white rounded-lg px-1 py-1 shadow-lg h-7" onClick={e => e.stopPropagation()}>
                <button onClick={() => updateQuantity(product.id, -1)} className="w-5 h-5 flex items-center justify-center hover:bg-black/10 rounded transition-colors">
                  <span className="material-symbols-outlined text-[10px] font-bold">remove</span>
                </button>
                <span className="w-4 text-center font-black text-[10px]">{cartItem.quantity}</span>
                <button onClick={() => updateQuantity(product.id, 1)} disabled={cartItem.quantity >= product.stock} className="w-5 h-5 flex items-center justify-center hover:bg-black/10 rounded transition-colors">
                  <span className="material-symbols-outlined text-[10px] font-bold">add</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info Area */}
        <div className="flex flex-col px-0.5">
           <div className="flex gap-1 mb-1">
             <span className="bg-zinc-100 text-zinc-500 text-[7px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">1 pc</span>
           </div>

           <Link href={`/product/${product.id}`} className="text-[10px] font-bold text-zinc-900 leading-[1.2] mb-1.5 line-clamp-2 hover:text-green-700" title={product.name}>
             {product.name}
           </Link>

           <div className="flex items-center flex-wrap gap-x-1.5">
              <span className="text-xs font-black text-zinc-900">₹{product.price.toFixed(0)}</span>
              <span className="text-[9px] text-zinc-400 line-through font-medium">₹{(product.price * 1.25).toFixed(0)}</span>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 w-full z-50 bg-white shadow-sm border-b border-zinc-100 px-4 py-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
          <span className="material-symbols-outlined text-zinc-900">arrow_back</span>
        </button>
        <div>
           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] leading-none mb-1">CATEGORY</p>
           <h1 className="text-xl font-headline font-black text-zinc-900 tracking-tighter uppercase italic leading-none">{id ? decodeURIComponent(id as string) : ""}</h1>
        </div>
      </header>

      <main className="pt-24 pb-20 px-4">
        {loading ? (
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {[1,2,3,4,5,6,7,8].map(n => <div key={n} className="aspect-[3/4] bg-zinc-50 rounded-xl animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center opacity-30">
            <span className="material-symbols-outlined text-6xl mb-4">inventory_2</span>
            <p className="font-headline font-black uppercase tracking-widest text-xs">No products</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </main>
    </div>
  );
}
