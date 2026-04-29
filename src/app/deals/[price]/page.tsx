"use client";

import { useStore } from "@/store/useStore";
import { useEffect, useMemo, Suspense } from "react";
import { Product } from "@/types";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";

function DealsContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const priceLimit = Number(params.price) || 0;
  const currentSection = (searchParams.get("section") || "BB") as "BB" | "CAFE";
  
  const { cart, addToCart, updateQuantity, products, fetchCatalog } = useStore();

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const dealProducts = useMemo(() => 
    products.filter(p => 
      ((p as any).section || "BB") === currentSection && 
      p.price <= priceLimit
    ).sort((a, b) => a.price - b.price),
  [products, currentSection, priceLimit]);

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
            {product.stock < 10 && product.stock > 0 && <span className="text-orange-600 text-[8px] font-bold tracking-tight">Only {product.stock} left</span>}
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
    <div className="bg-white min-h-screen relative overflow-x-hidden pb-44 text-zinc-900 font-body">
      <header className="sticky top-0 z-50 bg-[#00c04b] pt-safe pb-4 px-4 shadow-lg border-b border-black/5">
        <div className="pt-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex flex-col">
            <h1 className="text-white font-headline font-black text-xl tracking-tighter uppercase italic leading-none">
              Under ₹{priceLimit} Store
            </h1>
            <p className="text-white/70 text-[10px] font-bold tracking-[0.2em] uppercase mt-1">
              {dealProducts.length} Premium Items
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-8">
        {dealProducts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
            <span className="material-symbols-outlined text-6xl mb-4 text-zinc-300">inventory_2</span>
            <p className="font-headline font-black text-sm text-zinc-500 italic">No items found in this range</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-8">
            {dealProducts.map(p => (
              <div key={p.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function DealsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    }>
      <DealsContent />
    </Suspense>
  );
}
