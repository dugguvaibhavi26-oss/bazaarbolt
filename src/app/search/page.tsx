"use client";

import { useStore } from "@/store/useStore";
import { useState, useRef, useEffect, useMemo, Suspense } from "react";
import { Product } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { BottomNav } from "@/components/BottomNav";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSection = (searchParams.get("section") || "BB") as "BB" | "CAFE";
  
  const { cart, addToCart, updateQuantity, products, fetchCatalog } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(["Milk", "Bread", "Eggs", "Chips", "Cola"]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetchCatalog();
  }, [fetchCatalog]);

  const searchStr = searchTerm.trim().toLowerCase();
  
  const sectionProducts = useMemo(() => 
    products.filter(p => ((p as any).section || "BB") === currentSection),
  [products, currentSection]);

  const filteredProducts = useMemo(() => 
    searchStr !== '' 
      ? sectionProducts.filter(p =>
          p.name.toLowerCase().includes(searchStr) ||
          (p.category || "").toLowerCase().includes(searchStr)
        )
      : [],
  [searchStr, sectionProducts]);

  const otherSectionMatches = useMemo(() => {
    if (searchStr === '' || filteredProducts.length > 0) return 0;
    return products.filter(p => 
      ((p as any).section || "BB") !== currentSection && 
      (p.name.toLowerCase().includes(searchStr) || (p.category || "").toLowerCase().includes(searchStr))
    ).length;
  }, [searchStr, filteredProducts, products, currentSection]);

  const recommendations = useMemo(() => {
    const cartCategories = Array.from(new Set(cart.map(item => item.category)));
    const baseRecs = cartCategories.length > 0 
      ? sectionProducts.filter(p => cartCategories.includes(p.category) && !cart.some(c => c.id === p.id))
      : sectionProducts;
    return baseRecs.slice(0, 8);
  }, [cart, sectionProducts]);

  const ProductCard = ({ product }: { product: Product }) => {
    const cartItem = cart.find(c => c.id === product.id);
    const outOfStock = product.stock <= 0;

    return (
      <div className={`flex flex-col gap-1 transition-all group ${outOfStock ? 'opacity-60 grayscale' : ''}`}>
        <div className="relative aspect-square bg-white rounded-lg sm:rounded-xl overflow-hidden border border-zinc-100 cursor-pointer shadow-sm" onClick={() => router.push(`/product/${product.id}`)}>
          <img className="w-full h-full p-1.5 object-contain group-hover:scale-105 transition-transform duration-500" src={product.image} alt={product.name} />
          <div className="absolute bottom-1 right-1">
            {outOfStock ? (
              <div className="bg-red-50 border border-red-100 text-red-600 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase">
                Sold Out
              </div>
            ) : !cartItem ? (
              <button
                onClick={(e) => { e.stopPropagation(); addToCart({ ...product, quantity: 1 }); }}
                className="bg-white border-[1.2px] border-green-600 text-green-600 px-2.5 py-1 rounded-lg text-[8.5px] font-black hover:bg-green-600 hover:text-white transition-all active:scale-95"
              >
                Add
              </button>
            ) : (
              <div className="flex items-center bg-green-600 text-white rounded-lg px-0.5 py-0.5 shadow-md h-[22px]" onClick={e => e.stopPropagation()}>
                <button onClick={() => updateQuantity(product.id, -1)} className="w-3.5 h-3.5 flex items-center justify-center hover:bg-black/10 rounded transition-colors">
                  <span className="material-symbols-outlined text-[8px] font-bold">remove</span>
                </button>
                <span className="w-3 text-center font-black text-[8.5px]">{cartItem.quantity}</span>
                <button onClick={() => updateQuantity(product.id, 1)} disabled={cartItem.quantity >= product.stock} className="w-3.5 h-3.5 flex items-center justify-center hover:bg-black/10 rounded transition-colors">
                  <span className="material-symbols-outlined text-[8px] font-bold">add</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col px-0.5 mt-0.5">
          <div className="flex gap-1 mb-0.5 h-3.5">
            <span className="text-zinc-400 text-[8px] font-medium tracking-tight">1 Unit</span>
            {product.stock < 10 && product.stock > 0 && <span className="text-orange-600 text-[8px] font-bold tracking-tight">Only {product.stock} Left</span>}
          </div>
          <Link href={`/product/${product.id}`} className="text-[11px] font-bold text-zinc-900 leading-[1.2] mb-1 line-clamp-2 hover:text-green-700 tracking-tight" title={product.name}>
            {product.name}
          </Link>
          <div className="flex items-center flex-wrap gap-x-1.5">
            <span className="text-[12px] font-black text-zinc-900 tracking-tighter">₹{product.price.toFixed(0)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white min-h-screen relative overflow-x-hidden pb-44 text-zinc-900 font-body selection:bg-primary/30">
      
      <header className="sticky top-0 z-50 bg-white pt-safe pb-4 px-4 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border-b border-zinc-100">
        <div className="pt-4" />
         <div className="flex items-center gap-3 bg-zinc-100 rounded-2xl px-4 py-3 shadow-inner border border-zinc-200 focus-within:bg-white focus-within:border-primary transition-all">
           <button onClick={() => router.back()} className="text-zinc-600 hover:text-zinc-900 transition-colors flex items-center">
             <span className="material-symbols-outlined text-[20px]">arrow_back</span>
           </button>
           <input
             ref={inputRef}
             type="text"
             placeholder={currentSection === "CAFE" ? "Search in BB Cafe..." : "Search for milk, dal, chips and more..."}
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

      <main className="px-4 mt-[calc(24px+env(safe-area-inset-top,0px))]">
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
              <div className="py-20 flex flex-col items-center justify-center text-center">
                {otherSectionMatches > 0 ? (
                  <div className="bg-zinc-900 text-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
                    <div className="absolute -top-10 -right-10 opacity-10">
                      <span className="material-symbols-outlined text-[160px]">explore</span>
                    </div>
                    <span className="material-symbols-outlined text-4xl mb-4 text-primary" style={{fontVariationSettings: "'FILL'1"}}>bolt</span>
                    <h4 className="text-xl font-headline font-black tracking-tight mb-2">Not in {currentSection === "BB" ? "BazaarBolt" : "Cafe"}?</h4>
                    <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mb-6">We found {otherSectionMatches} matching items in <span className="text-white">{currentSection === "BB" ? "BB Cafe" : "BazaarBolt"}</span></p>
                    <button 
                      onClick={() => router.replace(`/search?section=${currentSection === "BB" ? "CAFE" : "BB"}`)}
                      className="bg-white text-zinc-900 px-8 py-4 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-primary hover:text-white transition-all shadow-xl active:scale-95"
                    >
                      Go to {currentSection === "BB" ? "Cafe" : "BazaarBolt"} Search
                    </button>
                  </div>
                ) : (
                  <div className="opacity-40">
                    <span className="material-symbols-outlined text-6xl mb-4 text-zinc-400">search_off</span>
                    <p className="font-headline font-black text-sm text-zinc-500">No items match your search</p>
                  </div>
                )}
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

    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
