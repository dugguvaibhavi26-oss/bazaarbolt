"use client";

import { useStore } from "@/store/useStore";
import { Product } from "@/types";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { mapProduct } from "@/lib/mappers";
import toast from "react-hot-toast";

interface ProductDetailsProps {
  productId: string;
  isInsideBottomSheet?: boolean;
  onClose?: () => void;
}

export function ProductDetails({ productId, isInsideBottomSheet, onClose }: ProductDetailsProps) {
  const router = useRouter();
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
            throw new Error("PRODUCT IS DELETED");
          }
        } else {
          toast.error("PRODUCT NOT FOUND");
          if (!isInsideBottomSheet) router.push("/");
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("COULD NOT LOAD PRODUCT DETAILS");
        if (!isInsideBottomSheet) router.push("/");
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [productId, router, isInsideBottomSheet]);

  if (loading) {
    return (
      <div className="bg-white flex flex-col px-4 pt-10 h-full">
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
    <div className="relative h-full overflow-y-auto hide-scrollbar pb-32">
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
              <span className="text-[10px] font-black text-zinc-400 tracking-widest">{Array.isArray(product.category) ? product.category.join(', ') : product.category}</span>
            </div>
            <h1 className="text-xl font-bold text-zinc-900 leading-snug">{product.name}</h1>
            {(product.rating || 0) > 0 ? (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center bg-[#f3f9f3] text-[#2d7d2d] px-2 py-0.5 rounded-md border border-[#e1eee1]">
                  <span className="text-xs font-black mr-0.5">{product.rating?.toFixed(1)}</span>
                  <span className="material-symbols-outlined text-xs" style={{fontVariationSettings: "'FILL'1"}}>star</span>
                </div>
                <button className="text-xs font-bold text-zinc-400 border-b border-zinc-200 pb-0.5 hover:text-zinc-600 transition-colors">
                  {product.ratingCount || 0} Ratings & Reviews
                </button>
              </div>
            ) : null}
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

        <div onClick={() => {
          const catId = Array.isArray(product.category) ? product.category[0] : product.category;
          if (onClose) onClose();
          router.push(`/category/${catId}`);
        }} className="mt-8 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-between group active:bg-zinc-100 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg border border-zinc-200 flex items-center justify-center p-1.5 shadow-sm">
              <span className="material-symbols-outlined text-primary text-sm font-black italic">bolt</span>
            </div>
            <p className="text-xs font-black text-zinc-800 tracking-tight">View all {Array.isArray(product.category) ? product.category[0] : product.category} products</p>
          </div>
          <span className="material-symbols-outlined text-zinc-300 text-sm group-hover:translate-x-1 transition-transform">arrow_forward_ios</span>
        </div>
      </section>

      {/* Detailed Info Sections */}
      <section className="mt-3 px-5 space-y-3 pb-20">
        {((product as any).section === "CAFE") && (
           <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex gap-3">
             <span className="material-symbols-outlined text-orange-500 shrink-0">info</span>
             <p className="text-[11px] font-bold text-orange-800 leading-relaxed">
               Notice: The actual product delivered may vary slightly from the image shown above due to fresh preparation and seasonal availability.
             </p>
           </div>
         )}

        <div className="bg-white p-6 rounded-3xl border border-zinc-100">
          <h3 className="text-[10px] font-black text-zinc-900 tracking-widest mb-4">Product Details</h3>
          <p className="text-[13px] font-bold text-zinc-500 leading-relaxed">
            {product.description || "Every BazaarBolt pick is fresh, handled with hygiene, and delivered in record time to ensure you get nothing but the best quality for your house."}
          </p>
        </div>

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
    </div>
  );
}
