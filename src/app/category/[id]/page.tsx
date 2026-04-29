"use client";

import { useStore } from "@/store/useStore";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/types";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function CategoryPage() {
  const { id } = useParams();
  const router = useRouter();
  const { cart, addToCart, updateQuantity, products, categories, fetchCatalog, catalogLoading } = useStore();
  const [search, setSearch] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("All");
  const [sortBy, setSortBy] = useState("Relevance");

  const decodedId = decodeURIComponent(id as string);
  const category = categories.find(c => c.id === decodedId || c.label === decodedId);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const categoryProducts = products.filter(p => 
    p.category === category?.id || p.category === category?.label || p.category === decodedId
  );

  const filteredProducts = categoryProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesSubcategory = selectedSubcategory === "All" || p.subcategory === selectedSubcategory;
    return matchesSearch && matchesSubcategory;
  }).sort((a, b) => {
    if (sortBy === "Price: Low to High") return a.price - b.price;
    if (sortBy === "Price: High to Low") return b.price - a.price;
    if (sortBy === "Rating") return (b.rating || 0) - (a.rating || 0);
    return 0; // Default: Relevance
  });

  const ProductCard = ({ product }: { product: Product }) => {
    const cartItem = cart.find(c => c.id === product.id);
    const outOfStock = product.stock <= 0;

    return (
      <div className={`flex flex-col gap-0.5 transition-all group ${outOfStock ? 'opacity-60 grayscale' : ''}`}>
        <div className="relative aspect-square bg-white rounded-md sm:rounded-lg overflow-hidden border border-zinc-100 cursor-pointer shadow-sm" onClick={() => router.push(`/product/${product.id}`)}>
          <img className="w-full h-full p-0.5 object-contain group-hover:scale-105 transition-transform duration-500" src={product.image} alt={product.name} />
          <div className="absolute bottom-0.5 right-0.5">
            {outOfStock ? (
              <div className="bg-red-50 border border-red-100 text-red-600 px-1 py-0.5 rounded text-[6px] font-black uppercase">
                OOS
              </div>
            ) : !cartItem ? (
              <button
                onClick={(e) => { e.stopPropagation(); addToCart({ ...product, quantity: 1 }); }}
                className="bg-white border border-green-600 text-green-600 px-2 py-0 rounded-md text-[9px] font-black hover:bg-green-600 hover:text-white transition-all active:scale-95 h-[22px] min-w-[44px] shadow-sm"
              >
                Add
              </button>
            ) : (
              <div className="flex items-center bg-green-600 text-white rounded-md px-1 py-0 shadow-md h-[22px]" onClick={e => e.stopPropagation()}>
                <button onClick={() => updateQuantity(product.id, -1)} className="w-5 h-full flex items-center justify-center hover:bg-black/10 rounded-sm transition-colors">
                  <span className="material-symbols-outlined text-[10px] font-bold">remove</span>
                </button>
                <span className="w-4 text-center font-black text-[10px]">{cartItem.quantity}</span>
                <button onClick={() => updateQuantity(product.id, 1)} disabled={cartItem.quantity >= product.stock} className="w-5 h-full flex items-center justify-center hover:bg-black/10 rounded-sm transition-colors">
                  <span className="material-symbols-outlined text-[10px] font-bold">add</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col px-0.5">
          <div className="flex items-center gap-1 h-2.5">
            <span className="text-zinc-400 text-[6.5px] font-medium tracking-tight whitespace-nowrap">1 Unit</span>
          </div>
          <Link href={`/product/${product.id}`} className="text-[8.5px] font-bold text-zinc-900 leading-[1] mb-0.5 line-clamp-2 hover:text-green-700 tracking-tight" title={product.name}>
            {product.name}
          </Link>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-black text-zinc-900 tracking-tighter">₹{product.price.toFixed(0)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl shadow-sm border-b border-zinc-100 px-4 pt-safe pt-8 pb-4 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
            <span className="material-symbols-outlined text-zinc-900">arrow_back</span>
          </button>
          <div>
            <p className="text-[10px] font-black text-zinc-400 tracking-widest leading-none mb-1">Category</p>
            <h1 className="text-xl font-headline font-black text-zinc-900 tracking-tighter leading-none">{category ? category.label : (id ? decodeURIComponent(id as string) : "")}</h1>
          </div>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-lg">search</span>
          <input 
            type="text" 
            placeholder={`Search in ${category?.label || 'category'}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-100 border-none rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all placeholder:normal-case"
          />
        </div>

        {/* Subcategories Bar */}
        {(category?.subcategories || []).length > 0 && (
          <div className="flex gap-4 lg:gap-6 overflow-x-auto hide-scrollbar -mx-4 px-4 py-2">
            <button 
              onClick={() => setSelectedSubcategory("All")}
              className="flex flex-col items-center gap-2 group shrink-0"
            >
              <div className={`w-14 h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${selectedSubcategory === 'All' ? 'border-green-600 bg-green-50 shadow-lg shadow-green-100 scale-105' : 'border-zinc-100 bg-zinc-50'}`}>
                <span className="material-symbols-outlined text-zinc-400">grid_view</span>
              </div>
              <span className={`text-[9px] lg:text-[10px] font-black tracking-widest uppercase transition-colors ${selectedSubcategory === 'All' ? 'text-green-600' : 'text-zinc-500'}`}>All</span>
            </button>

            {category?.subcategories?.map((sub: any, idx: number) => {
              const label = typeof sub === 'string' ? sub : sub.label;
              const img = typeof sub === 'string' ? "" : sub.img;
              const id = typeof sub === 'string' ? sub : (sub.id || sub.label);
              
              return (
                <button 
                  key={id || idx}
                  onClick={() => setSelectedSubcategory(label)}
                  className="flex flex-col items-center gap-2 group shrink-0"
                >
                  <div className={`w-14 h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden border transition-all duration-300 flex items-center justify-center p-2.5 shadow-sm ${selectedSubcategory === label ? 'border-green-600 bg-white shadow-lg shadow-green-100 scale-105' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}>
                    {img ? (
                      <img src={img} alt={label} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                    ) : (
                      <span className="material-symbols-outlined text-zinc-300 text-lg">category</span>
                    )}
                  </div>
                  <span className={`text-[9px] lg:text-[10px] font-black tracking-widest uppercase transition-colors ${selectedSubcategory === label ? 'text-green-600' : 'text-zinc-500 group-hover:text-zinc-900'}`}>{label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Sort Bar */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 border-t border-zinc-50 pt-3">
          <span className="material-symbols-outlined text-[14px] text-zinc-400">sort</span>
          <span className="text-[9px] font-black text-zinc-400 tracking-widest uppercase mr-2 shrink-0">Sort By:</span>
          {["Relevance", "Price: Low to High", "Price: High to Low", "Rating"].map(sort => (
            <button 
              key={sort}
              onClick={() => setSortBy(sort)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-wider transition-all whitespace-nowrap ${sortBy === sort ? 'text-primary' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              {sort}
            </button>
          ))}
        </div>
      </header>

      <main className="pt-[calc(300px+env(safe-area-inset-top,0px))] pb-20 px-4">
        {catalogLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <div key={n} className="aspect-[3/4] bg-zinc-50 rounded-xl animate-pulse" />)}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center opacity-30">
            <span className="material-symbols-outlined text-6xl mb-4">inventory_2</span>
            <p className="font-headline font-black tracking-widest text-xs">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

      </main>
    </div>
  );
}
