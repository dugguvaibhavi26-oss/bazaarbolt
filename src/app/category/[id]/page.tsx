"use client";

import { useStore } from "@/store/useStore";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/types";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AdUnit } from "@/components/AdUnit";

export default function CategoryPage() {
  const { id } = useParams();
  const router = useRouter();
  const { cart, addToCart, updateQuantity } = useStore();
  const [category, setCategory] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!id) return;
    const decodedId = decodeURIComponent(id as string);
    let unsubProducts: (() => void) | null = null;

    const unsubCat = onSnapshot(doc(db, "categories", decodedId), (catDoc) => {
      let label = "";
      if (catDoc.exists()) {
        const data = catDoc.data();
        setCategory({ id: catDoc.id, ...data });
        label = data.label;
      }
      
      if (unsubProducts) unsubProducts();
      
      const searchValues = [decodedId];
      if (label && label !== decodedId) searchValues.push(label);

      const q = query(collection(db, "products"), where("category", "in", searchValues));
      unsubProducts = onSnapshot(q, (snapshot) => {
        const prods = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() } as Product))
          .filter(p => !p.isDeleted && p.active);
        setProducts(prods);
        setLoading(false);
      });
    });

    return () => {
      unsubCat();
      if (unsubProducts) (unsubProducts as () => void)();
    };
  }, [id]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const ProductCard = ({ product }: { product: Product }) => {
    const cartItem = cart.find(c => c.id === product.id);
    const outOfStock = product.stock <= 0;

    return (
      <div className={`flex flex-col gap-1.5 transition-all group ${outOfStock ? 'opacity-60 grayscale' : ''}`}>
        <div className="relative aspect-square bg-[#F3F4F6] rounded-2xl overflow-hidden border border-zinc-100 cursor-pointer" onClick={() => router.push(`/product/${product.id}`)}>
          <img className="w-full h-full p-2 object-contain group-hover:scale-105 transition-transform duration-500" src={product.image} alt={product.name} />
          <div className="absolute bottom-1 right-1">
            {!cartItem ? (
              <button
                disabled={outOfStock}
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
            <span className="bg-zinc-100 text-zinc-500 text-[7px] font-bold px-1.5 py-0.5 rounded tracking-wider italic-remove">1 pc</span>
          </div>
          <Link href={`/product/${product.id}`} className="text-[10px] font-bold text-zinc-900 leading-[1.2] mb-1.5 line-clamp-2 hover:text-green-700" title={product.name}>
            {product.name}
          </Link>
          <div className="flex items-center flex-wrap gap-x-1.5">
            <span className="text-xs font-black text-zinc-900 tracking-tight">₹{product.price.toFixed(0)}</span>
            <span className="text-[9px] text-zinc-400 line-through font-medium tracking-tight">₹{(product.price * 1.25).toFixed(0)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl shadow-sm border-b border-zinc-100 px-4 py-4 flex flex-col gap-4">
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
            className="w-full bg-zinc-100 border-none rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
          />
        </div>
      </header>

      <main className="pt-40 pb-20 px-4">
        {loading ? (
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
        <AdUnit slotId="category-bottom" className="mt-12" />
      </main>
    </div>
  );
}
