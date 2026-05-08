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
  const { cart } = useStore();
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
        <div className="animate-pulse space-y-4">
          <div className="w-full h-[250px] bg-zinc-100 rounded-3xl"/>
          <div className="w-2/3 h-6 bg-zinc-100 rounded-xl"/>
          <div className="w-full h-32 bg-zinc-100 rounded-3xl"/>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="relative pb-32">
      {/* Hero Image Section - Optimized for mobile visibility */}
      <section 
        className={`bg-white w-full flex items-center justify-center p-6 relative transition-all duration-500 ${!isInsideBottomSheet ? 'pt-28' : 'pt-4'}`} 
        style={{ 
          height: isInsideBottomSheet ? '30vh' : '40vh', 
          minHeight: isInsideBottomSheet ? '220px' : '300px',
          maxHeight: isInsideBottomSheet ? '300px' : '450px'
        }}
      >
        <div className="w-full h-full relative group">
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-contain drop-shadow-2xl transform transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      </section>

      {/* Main Info Card - Compressed */}
      <section className="bg-white px-4 py-3 rounded-b-[24px] shadow-sm border-b border-zinc-100">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">
              <span className="material-symbols-outlined text-[10px]">timer</span>
              <span>10 MINS</span>
            </div>
            <span className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">
              {Array.isArray(product.category) ? product.category.join(', ') : product.category}
            </span>
          </div>
          
          <h1 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">{product.name}</h1>
          <p className="text-[11px] font-bold text-zinc-400">1 unit</p>
          
          {(product.rating || 0) > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center bg-[#f3f9f3] text-[#2d7d2d] px-1.5 py-0.5 rounded border border-[#e1eee1]">
                <span className="text-[10px] font-black mr-0.5">{product.rating?.toFixed(1)}</span>
                <span className="material-symbols-outlined text-[10px]" style={{fontVariationSettings: "'FILL'1"}}>star</span>
              </div>
              <span className="text-[10px] font-bold text-zinc-400">
                {product.ratingCount || 0} Ratings
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Detailed Info Sections - Compressed */}
      <section className="mt-2 px-4 space-y-2 pb-10">
        {((product as any).section === "CAFE") && (
           <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex gap-2 items-start">
             <span className="material-symbols-outlined text-orange-500 text-sm mt-0.5 shrink-0">info</span>
             <p className="text-[10px] font-bold text-orange-800 leading-relaxed">
               Actual product delivered may vary slightly from the image shown due to fresh preparation.
             </p>
           </div>
         )}

        <div className="bg-white p-4 rounded-[20px] border border-zinc-100 shadow-sm">
          <h3 className="text-[9px] font-black text-zinc-900 tracking-widest mb-1.5 uppercase">Product Details</h3>
          <p className="text-[11px] font-bold text-zinc-500 leading-relaxed">
            {product.description || "Every BazaarBolt pick is fresh, handled with hygiene, and delivered in record time to ensure you get nothing but the best quality for your house."}
          </p>
        </div>

        {/* Why BazaarBolt Badges */}
        <div className="bg-white p-4 rounded-[20px] border border-zinc-100 shadow-sm">
          <h3 className="text-[9px] font-black text-zinc-900 tracking-widest mb-3 uppercase">Why shop from us?</h3>
          <div className="space-y-3">
            {[
              {icon: 'electric_bolt', title: 'Superfast Delivery', sub: 'Get your order delivered to your doorstep at the earliest.'},
              {icon: 'verified_user', title: 'Best Prices & Offers', sub: 'Cheaper prices than your local supermarket, great cashback offers.'},
              {icon: 'package_2', title: 'Wide Assortment', sub: 'Choose from 5000+ products across food, personal care, household, bakery, veg and non-veg.'},
            ].map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-8 h-8 bg-zinc-50 rounded-full flex items-center justify-center text-zinc-900 shrink-0 border border-zinc-100">
                  <span className="material-symbols-outlined text-sm">{item.icon}</span>
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-zinc-900 leading-none mb-0.5">{item.title}</h4>
                  <p className="text-[8px] font-bold text-zinc-400 leading-tight">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
