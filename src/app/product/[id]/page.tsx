"use client";

import { useStore } from "@/store/useStore";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Product } from "@/types";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { mapProduct } from "@/lib/mappers";

export default function ProductPage() {
 const params = useParams();
 const productId = params?.id as string;
 const router = useRouter();
 const { cart, addToCart, updateQuantity, products } = useStore();
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
 throw new Error("PRODUCT IS DELETED");
 }
 } else {
 toast.error("PRODUCT NOT FOUND");
 router.push("/");
 }
 } catch (error) {
 console.error("Error fetching product:", error);
 toast.error("COULD NOT LOAD PRODUCT DETAILS");
 router.push("/");
 } finally {
 setLoading(false);
 }
 }
 fetchProduct();
 }, [productId, router]);

 if (loading) {
 return (
 <div className="min-h-screen bg-white flex flex-col px-4 pt-10">
 <div className="animate-pulse space-y-6">
 <div className="w-full aspect-square bg-zinc-100 rounded-3xl"/>
 <div className="w-2/3 h-8 bg-zinc-100 rounded-xl"/>
 <div className="w-full h-40 bg-zinc-100 rounded-3xl"/>
 </div>
 </div>
 );
 }

 if (!product) return null;

 const cartItem = cart.find(c => c.id === product.id);
 const outOfStock = product.stock <= 0;

 return (
 <main className="min-h-screen bg-zinc-50 pb-40">
 {/* Simple Floating Header */}
 <header className="fixed top-0 w-full z-50 p-4 flex justify-between items-center pointer-events-none">
 <button onClick={() => router.back()} className="w-10 h-10 bg-white rounded-full shadow-lg pointer-events-auto active:scale-90 transition-transform flex items-center justify-center border border-zinc-100">
 <span className="material-symbols-outlined text-zinc-900 font-bold">arrow_back</span>
 </button>
 <div className="flex gap-2">
 <button onClick={() => router.push('/search')} className="w-10 h-10 bg-white rounded-full shadow-lg pointer-events-auto active:scale-90 transition-transform flex items-center justify-center border border-zinc-100">
 <span className="material-symbols-outlined text-zinc-900 font-bold">search</span>
 </button>
 </div>
 </header>

 {/* Hero Image Section */}
 <section className="bg-white w-full aspect-square flex items-center justify-center p-10 relative">
 <img src={product.image} alt={product.name} className="w-full h-full object-contain"/>
 </section>

 {/* Main Info Card */}
 <section className="bg-white px-5 py-6 rounded-b-[32px] shadow-sm border-b border-zinc-100">
 <div className="flex items-start justify-between gap-4 mb-3">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-2">
 <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-md text-[10px] font-black">
 <span className="material-symbols-outlined text-xs">event_available</span>
 <span>Slot Only</span>
 </div>
 <span className="text-[10px] font-black text-zinc-400 tracking-widest">{product.category}</span>
 </div>
 <h1 className="text-xl font-bold text-zinc-900 leading-snug">{product.name}</h1>
  {product.rating && product.rating > 0 && (
    <div className="flex items-center gap-1.5 mt-2">
      <div className="flex items-center bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-md text-[10px] font-black border border-yellow-100">
        <span className="material-symbols-outlined text-xs" style={{fontVariationSettings: "'FILL'1"}}>star</span>
        <span>{product.rating.toFixed(1)}</span>
      </div>
      <span className="text-[10px] font-bold text-zinc-400">({product.ratingCount || 0} reviews)</span>
    </div>
  )}
 <p className="text-sm font-bold text-zinc-400 mt-1 tracking-tight">Net quantity: 1 unit</p>
 </div>
 <button className="w-10 h-10 bg-white border border-zinc-100 rounded-full text-zinc-400 shadow-sm active:scale-90 transition-transform flex items-center justify-center">
 <span className="material-symbols-outlined font-black">favorite</span>
 </button>
 </div>

 <div className="mt-6 flex flex-col gap-1">
 <div className="flex items-center gap-3">
 <div className="bg-green-600 text-white px-3 py-1.5 rounded-lg font-black text-xl">
 ₹{product.price.toFixed(0)}
 </div>
 <div className="flex flex-col">
 <p className="text-[10px] font-bold text-zinc-400">
 MRP <span className="line-through">₹{(product.price * 1.5).toFixed(0)}</span>
 </p>
 <p className="text-[10px] font-black text-green-600">₹{(product.price * 0.5).toFixed(0)} Off</p>
 </div>
 </div>
 <p className="text-[9px] font-bold text-zinc-400 mt-1">(Incl. of all taxes)</p>
 </div>

 {/* Brand Reference - Mini Promo */}
 <div onClick={() => router.push(`/category/${product.category}`)} className="mt-8 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-between group active:bg-zinc-100 transition-colors cursor-pointer">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-white rounded-lg border border-zinc-200 flex items-center justify-center p-1.5 shadow-sm">
 <span className="material-symbols-outlined text-primary text-sm font-black italic">bolt</span>
 </div>
 <p className="text-xs font-black text-zinc-800 tracking-tight">View all {product.category} products</p>
 </div>
 <span className="material-symbols-outlined text-zinc-300 text-sm group-hover:translate-x-1 transition-transform">arrow_forward_ios</span>
 </div>
 </section>

 {/* Detailed Info Sections */}
 <section className="mt-3 px-5 space-y-3">
 <div className="bg-white p-6 rounded-3xl border border-zinc-100">
 <h3 className="text-[10px] font-black text-zinc-900 tracking-widest mb-4">Product Details</h3>
 <p className="text-[13px] font-bold text-zinc-500 leading-relaxed">
 {product.description || "Every BazaarBolt pick is fresh, handled with hygiene, and delivered in record time to ensure you get nothing but the best quality for your house."}
 </p>
 </div>

 {/* Why BazaarBolt Badges */}
 <div className="bg-white p-6 rounded-3xl border border-zinc-100">
 <h3 className="text-[10px] font-black text-zinc-900 tracking-widest mb-6">Why shop from BazaarBolt?</h3>
 <div className="space-y-6">
 {[
 {icon: 'electric_bolt', title: 'On-Time Delivery', sub: 'Your order will be delivered within your selected time slot.'},
 {icon: 'verified_user', title: 'Best Prices & Offers', sub: 'Cheaper than your local supermarket and crazy offers every day.'},
 {icon: 'package_2', title: 'Wide Assortment', sub: 'Choose from 5000+ products across grocery, household, and beauty.'},
 ].map((item, i) => (
 <div key={i} className="flex gap-4">
 <div className="w-10 h-10 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-900 shrink-0">
 <span className="material-symbols-outlined text-xl">{item.icon}</span>
 </div>
 <div>
 <h4 className="text-xs font-black text-zinc-900 mb-0.5">{item.title}</h4>
 <p className="text-[10px] font-bold text-zinc-400 leading-tight">{item.sub}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* Fixed Bottom Action Bar */}
 <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-zinc-100 p-4 pb-safe z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
 <div className="max-w-2xl mx-auto flex items-center gap-4">
 {outOfStock ? (
 <button disabled
 className="flex-1 h-14 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-black text-[12px] tracking-widest cursor-not-allowed uppercase"
 >
 Sold Out
 </button>
 ) : !cartItem ? (
 <button
 onClick={() => addToCart({...product, quantity: 1})}
 className="flex-1 h-14 bg-primary text-zinc-900 rounded-2xl font-black text-[12px] tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase"
 >
 Add to cart
 </button>
 ) : (
 <div className="w-full flex items-center gap-4">
 <div className="flex-1 h-14 bg-zinc-900 text-white rounded-2xl flex items-center justify-between px-2 overflow-hidden shadow-2xl">
 <button onClick={() => updateQuantity(product.id, -1)}
 className="w-14 h-12 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors"
 >
 <span className="material-symbols-outlined font-black">remove</span>
 </button>
 <div className="flex flex-col items-center">
 <span className="text-sm font-black leading-none">{cartItem.quantity}</span>
 <span className="text-[7px] font-black text-zinc-500 mt-1 uppercase tracking-widest">In Cart</span>
 </div>
 <button onClick={() => updateQuantity(product.id, 1)}
 disabled={cartItem.quantity >= product.stock}
 className="w-14 h-12 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors disabled:opacity-20"
 >
 <span className="material-symbols-outlined font-black">add</span>
 </button>
 </div>
 <button onClick={() => router.push("/cart")}
 className="w-14 h-14 bg-primary text-zinc-900 rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 active:scale-95 transition-all"
 >
 <span className="material-symbols-outlined font-black text-2xl">shopping_bag</span>
 </button>
 </div>
 )}
 </div>
 </div>
 </main>
 );
}
