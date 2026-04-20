"use client";

import { useStore } from "@/store/useStore";
import { useState, useRef, useEffect } from "react";
import { Product } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { AdUnit } from "@/components/AdUnit";
import { BottomNav } from "@/components/BottomNav";

export default function SearchPage() {
  const router = useRouter();
  const { cart, addToCart, updateQuantity, products, fetchCatalog } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(["Milk", "Bread", "Eggs", "Chips", "Cola"]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetchCatalog();
  }, [fetchCatalog]);

  const searchStr = searchTerm.trim().toLowerCase();
  const filteredProducts = searchStr !== '' 
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchStr) ||
        (p.category || "").toLowerCase().includes(searchStr)
      )
    : [];

  const cartCategories = Array.from(new Set(cart.map(item => item.category)));
  const recommendations = cartCategories.length > 0 
    ? products.filter(p => cartCategories.includes(p.category) && !cart.some(c => c.id === p.id)).slice(0, 8)
    : products.slice(0, 8);

  const ProductCard = ({ product }: { product: Product }) => {
    const cartItem = cart.find(c => c.id === product.id);
    const outOfStock = product.stock <= 0;

    return (
      <div className={`flex flex-col gap-1.5 transition-all group ${outOfStock ? 'opacity-60 grayscale' : ''}`}>
        <div className="relative aspect-square bg-[#F3F4F6] rounded-2xl overflow-hidden border border-zinc-100 cursor-pointer" onClick={() => router.push(`/product/${product.id}`)}>
          <img className="w-full h-full p-2 object-contain group-hover:scale-105 transition-transform duration-500" src={product.image} alt={product.name} />
          <div className="absolute bottom-1 right-1">
            {outOfStock ? (
              <div className="bg-red-50 border border-red-100 text-red-600 px-2 py-1 rounded-lg text-[8px] font-black shadow-sm">
                Sold Out
              </div>
            ) : !cartItem ? (
              <button
                onClick={(e) => { e.stopPropagation(); addToCart({ ...product, quantity: 1 }); }}
                className="bg-white border-[1.5px] border-green-600 text-green-600 px-3 py-1 rounded-lg text-[10px] font-black shadow-lg active:scale-90 transition-all"
              >
                Add
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
        <div className="flex flex-col px-0.5">
          <div className="flex gap-1 mb-1">
            <span className="bg-zinc-100 text-zinc-500 text-[7px] font-bold px-1.5 py-0.5 rounded tracking-wider">1 Unit</span>
            {product.stock < 10 && product.stock > 0 && <span className="bg-orange-50 text-orange-600 text-[7px] font-bold px-1.5 py-0.5 rounded tracking-wider">Only {product.stock} left</span>}
          </div>
          <Link href={`/product/${product.id}`} className="text-[10px] font-bold text-zinc-900 leading-[1.2] mb-1.5 line-clamp-2 hover:text-green-700 tracking-tight" title={product.name}>
            {product.name}
          </Link>
          <div className="flex items-center flex-wrap gap-x-1.5">
            <span className="text-xs font-black text-zinc-900">₹{product.price.toFixed(0)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen relative overflow-x-hidden pb-44 text-zinc-900 font-body selection:bg-primary/30">
      
      <header className="sticky top-0 z-50 bg-white pt-4 pb-4 px-4 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border-b border-zinc-100">
         <div className="flex items-center gap-3 bg-zinc-100 rounded-2xl px-4 py-3 shadow-inner border border-zinc-200 focus-within:bg-white focus-within:border-primary transition-all">
           <button onClick={() => router.back()} className="text-zinc-600 hover:text-zinc-900 transition-colors flex items-center">
             <span className="material-symbols-outlined text-[20px]">arrow_back</span>
           </button>
           <input
             ref={inputRef}
             type="text"
             placeholder="Search for milk, dal, chips and more..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="bg-transparent border-none outline-none w-full text-xs font-black tracking-widest placeholder:text-zinc-400 text-zinc-900 placeholder:normal-case"
           />
           {searchTerm && (
             <button onClick={() => setSearchTerm('')} className="text-zinc-400 hover:text-zinc-900 flex items-center">
               <span className="material-symbols-outlined text-[16px]">close</span>
             </button>
           )}
           {!searchTerm && (
             <button className="text-zinc-400 hover:text-zinc-900 flex items-center">
                <span className="material-symbols-outlined text-[20px]">mic</span>
             </button>
           )}
         </div>
      </header>

      <main className="px-4 mt-6">
        {searchStr === '' ? (
          <div className="animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline font-black text-[10px] text-zinc-400 tracking-widest">Recommendations</h3>
            </div>
            {recentSearches.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-10">
                {recentSearches.map((item, i) => (
                  <button 
                    key={i} 
                    onClick={() => setSearchTerm(item)} 
                    className="pl-2 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-colors flex items-center gap-2 shadow-sm tracking-tighter"
                  >
                    <div className="w-6 h-6 rounded bg-zinc-200 flex items-center justify-center flex-shrink-0">
                       <span className="material-symbols-outlined text-[14px] text-zinc-500">search</span>
                    </div>
                    {item}
                  </button>
                ))}
              </div>
            )}

            <h3 className="font-headline font-black text-[10px] text-zinc-400 tracking-widest mb-4">Top picks for you</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-x-3 gap-y-6">
              {recommendations.slice(0, 8).map(p => (
                 <div key={p.id} className="bg-white rounded-2xl p-0 border border-transparent">
                    <ProductCard product={p} />
                 </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <h3 className="font-headline font-black text-[10px] text-zinc-400 mb-4 tracking-widest">{filteredProducts.length} results for "{searchTerm}"</h3>
            {filteredProducts.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                <span className="material-symbols-outlined text-6xl mb-4 text-zinc-400">search_off</span>
                <p className="font-headline font-black text-sm text-zinc-500">No items match your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-x-3 gap-y-6">
                {filteredProducts.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl p-0 border border-transparent">
                     <ProductCard product={p} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <div className="px-4 mt-12 mb-8">
        <AdUnit slotId="search-bottom-banner" className="m-0" />
      </div>
    </div>
  );
}
