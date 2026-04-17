"use client";

import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Product } from "@/types";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { mapProduct } from "@/lib/mappers";

export default function ProductPage() {
  const params = useParams();
  const productId = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { cart, addToCart, updateQuantity } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      if (!productId) return;
      try {
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const prod = mapProduct(docSnap);
          if (!prod.isDeleted) {
            setProduct(prod);
          } else {
            throw new Error("Product is deleted");
          }
        } else {
          toast.error("Product not found");
          router.push("/");
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Could not load product details");
        router.push("/");
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [productId, router]);

  if (loading) {
     return (
        <div className="min-h-screen bg-surface flex flex-col pt-12 px-4 max-w-sm mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="w-full h-80 bg-surface-container-low rounded-3xl" />
            <div className="w-2/3 h-8 bg-surface-container-low rounded-xl" />
            <div className="w-1/3 h-6 bg-surface-container-low rounded-xl" />
            <div className="w-full h-24 bg-surface-container-low rounded-3xl" />
          </div>
        </div>
     );
  }

  if (!product) return null;

  const cartItem = cart.find(c => c.id === product.id);
  const outOfStock = product.stock <= 0;

  return (
    <main className="min-h-screen bg-surface pb-32">
       {/* Transparent Floating Header */}
       <header className="fixed top-0 w-full z-50 p-4 shrink-on-scroll pointer-events-none">
          <div className="max-w-3xl mx-auto flex justify-between items-center w-full pointer-events-auto">
             <button onClick={() => router.back()} className="p-3 bg-white/80 backdrop-blur-md rounded-full shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1)] hover:scale-105 active:scale-95 transition-transform border border-white/50">
                <span className="material-symbols-outlined text-zinc-900 font-bold" style={{fontVariationSettings: "'FILL' 1"}}>arrow_back</span>
             </button>
             <button onClick={() => toast("Added to Wishlist", {icon: '❤️'})} className="p-3 bg-white/80 backdrop-blur-md rounded-full shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1)] hover:scale-105 active:scale-95 transition-transform border border-white/50">
                <span className="material-symbols-outlined text-zinc-900 font-bold" style={{fontVariationSettings: "'FILL' 0"}}>favorite</span>
             </button>
          </div>
       </header>

       {/* Product Image Section */}
       <section className="bg-zinc-50 w-full rounded-b-[40px] shadow-sm overflow-hidden relative border-b border-surface-variant/50 pt-20 pb-12 px-8 flex justify-center items-center h-[50dvh]">
          <img src={product.image} alt={product.name} className="w-full h-full object-contain drop-shadow-xl z-10" />
          {/* Decorative blur matching product color */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary rounded-full mix-blend-multiply filter blur-[100px] opacity-20 pointer-events-none"></div>
       </section>

       {/* Product Info Section */}
       <section className="px-5 pt-8 max-w-3xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-2">
             <h1 className="text-3xl font-headline font-black text-zinc-900 tracking-tight leading-tight">{product.name}</h1>
          </div>
          <div className="flex items-center gap-2 mb-6">
             <span className="bg-primary/10 text-primary font-black uppercase text-[10px] tracking-widest px-2.5 py-1 rounded-md border border-primary/20">
                {product.category || 'CATEGORY'}
             </span>
             <span className="flex items-center text-zinc-500 font-bold text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-xs mr-1 text-yellow-500" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                4.8 (120 reviews)
             </span>
          </div>

          <div className="flex items-end justify-between bg-surface-container-lowest p-5 rounded-3xl border border-surface-variant/50 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.04)] mb-8">
             <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Price</p>
                <div className="flex items-center gap-2">
                   <h2 className="text-4xl font-headline font-black text-zinc-900 tracking-tighter leading-none">₹{product.price.toFixed(2)}</h2>
                   <span className="text-sm text-zinc-400 font-bold line-through mt-1">₹{(product.price * 1.25).toFixed(2)}</span>
                </div>
             </div>
             
             {!cartItem ? (
                <button 
                  disabled={outOfStock}
                  onClick={() => addToCart({...product, quantity: 1})}
                  className="bg-primary hover:bg-inverse-primary text-zinc-900 px-8 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-[0_8px_16px_-4px_rgba(34,197,94,0.4)] active:scale-95 transition-all disabled:opacity-50 disabled:bg-zinc-200 disabled:text-zinc-500 disabled:shadow-none"
                >
                  {outOfStock ? 'SOLD OUT' : 'ADD TO CART'}
                </button>
             ) : (
                <div className="flex items-center bg-primary text-white rounded-2xl px-2 py-2 shadow-[0_8px_16px_-4px_rgba(34,197,94,0.4)] h-14 w-36 justify-between">
                  <button 
                    onClick={() => updateQuantity(product.id, -1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-black/20 rounded-xl transition-colors active:scale-95"
                  >
                    <span className="material-symbols-outlined font-bold text-white text-lg" data-icon="remove">remove</span>
                  </button>
                  <span className="font-headline font-black text-lg text-white w-4 text-center">{cartItem.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(product.id, 1)}
                    disabled={cartItem.quantity >= product.stock}
                    className={`w-10 h-10 flex items-center justify-center hover:bg-black/20 rounded-xl transition-colors active:scale-95 ${cartItem.quantity >= product.stock ? 'opacity-50' : ''}`}
                  >
                    <span className="material-symbols-outlined font-bold text-white text-lg" data-icon="add">add</span>
                  </button>
                </div>
             )}
          </div>
          
          <div className="space-y-6">
             <div>
                <h3 className="font-headline font-extrabold text-lg text-zinc-900 mb-2">Product Details</h3>
                <p className="text-sm font-medium text-zinc-600 leading-relaxed bg-zinc-50 p-5 rounded-2xl border border-zinc-100">
                   {product.description || "No detailed description available for this product. Fresh, high-quality ingredients sourced directly from verified vendors to ensure maximum freshness and satisfaction."}
                </p>
             </div>
             
             {/* Guarantee badging */}
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex flex-col gap-2">
                   <div className="w-8 h-8 rounded-full bg-green-200/50 flex items-center justify-center text-green-700">
                      <span className="material-symbols-outlined text-lg" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                   </div>
                   <div>
                      <p className="font-headline font-extrabold text-sm text-green-900">100% Quality</p>
                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-0.5">Assured</p>
                   </div>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex flex-col gap-2">
                   <div className="w-8 h-8 rounded-full bg-blue-200/50 flex items-center justify-center text-blue-700">
                      <span className="material-symbols-outlined text-lg" style={{fontVariationSettings: "'FILL' 1"}}>support_agent</span>
                   </div>
                   <div>
                      <p className="font-headline font-extrabold text-sm text-blue-900">Helpdesk</p>
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">24/7 Support</p>
                   </div>
                </div>
             </div>
          </div>
       </section>

       {/* Floating View Cart Action */}
       {cart.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[400px] z-50 px-4">
             <button 
               onClick={() => router.push("/cart")} 
               className="w-full bg-zinc-900 hover:bg-black text-white h-16 rounded-2xl flex items-center justify-between px-6 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.5)] active:scale-95 transition-all group"
             >
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                     <span className="material-symbols-outlined text-primary font-bold">shopping_bag</span>
                   </div>
                   <div className="flex flex-col items-start leading-none gap-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{cart.reduce((a,b)=>a+b.quantity,0)} Items in Cart</span>
                      <span className="text-sm font-headline font-black text-white uppercase">View Cart</span>
                   </div>
                </div>
                <span className="material-symbols-outlined font-bold group-hover:translate-x-1 transition-transform text-primary">arrow_forward_ios</span>
             </button>
          </div>
       )}
    </main>
  );
}
