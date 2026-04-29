"use client";

import React, { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { collection, onSnapshot, query, where, doc, updateDoc, arrayUnion, getDocs, limit, orderBy, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, Address, Order, PromoSection } from "@/types";
import { mapOrder } from "@/lib/mappers";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { AdUnit } from "@/components/AdUnit";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { Portal } from "@/components/Portal";
export default function Home() {
  const {
    settings, initSettings, settingsLoading,
    products, categories, catalogLoading, fetchCatalog,
    cart, addToCart, updateQuantity, selectedAddress, setSelectedAddress
  } = useStore();
  const { user, role, loading: authLoading, userData } = useAuth();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<"BB" | "CAFE">("BB");
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState<Address>({
    line1: "",
    line2: "",
    city: "Chevella",
    pincode: "",
    landmark: ""
  });

  const [pendingRatingOrder, setPendingRatingOrder] = useState<Order | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user?.uid) return;
    const fetchPendingRating = async () => {
      try {
        // Only querying by userId and ordering by date avoids the need for a new composite index.
        const q = query(collection(db, "orders"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(10));
        const snaps = await getDocs(q);
        const orders = snaps.docs.map(mapOrder);
        // Find the most recent DELIVERED order that has not been rated yet
        const orderToRate = orders.find(o => o.status === "DELIVERED" && !o.rated);
        if (orderToRate) setPendingRatingOrder(orderToRate);
      } catch (e) {
        console.error("Rating check error", e);
      }
    };
    fetchPendingRating();
  }, [user]);

  const submitRating = async () => {
    if (!pendingRatingOrder?.id) return;
    try {
      await runTransaction(db, async (transaction) => {
        // Update Order
        const orderRef = doc(db, "orders", pendingRatingOrder.id!);
        transaction.update(orderRef, { rated: true });

        // Update Products
        for (const item of pendingRatingOrder.items) {
          const rating = ratings[item.id];
          if (!rating) continue;

          const prodRef = doc(db, "products", item.id);
          const prodSnap = await transaction.get(prodRef);
          if (prodSnap.exists()) {
            const data = prodSnap.data();
            const currentRating = data.rating || 0;
            const currentCount = data.ratingCount || 0;
            const newCount = currentCount + 1;
            const newRating = ((currentRating * currentCount) + rating) / newCount;
            transaction.update(prodRef, { rating: newRating, ratingCount: newCount });
          }
        }
      });

      toast.success("Thank you for your feedback!");
      setPendingRatingOrder(null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to submit rating");
    }
  };

  // Dynamic Banners from Settings
  const BANNERS = (settings?.heroBanners?.length
    ? settings.heroBanners
    : [
      {
        url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000",
        title: "Fresh Harvest",
        subtitle: "Direct From Farms",
        section: "BB" as const
      },
      {
        url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=1000",
        title: "Artisan Brews",
        subtitle: "Freshly Roasted",
        section: "CAFE" as const
      }
    ]
  ).filter(b => (b.section || "BB") === activeSection);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      if (role === 'admin') router.replace("/admin");
      else if (role === 'rider') router.replace("/rider");
      else if (role === 'vendor') router.replace("/vendor");
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    initSettings();
    fetchCatalog();
  }, [initSettings, fetchCatalog]);

  // Filter content based on active section
  const filteredCategories = categories.filter(cat => {
    return ((cat as any).section || "BB") === activeSection;
  });

  const filteredProducts = products.filter(p => {
    return ((p as any).section || "BB") === activeSection;
  });

  useEffect(() => {
    setCurrentBannerIndex(0);
  }, [activeSection]);

  useEffect(() => {
    if (BANNERS.length <= 1) {
      setCurrentBannerIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [BANNERS.length]);

  if (!authLoading && user && role !== 'customer') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  const handleSaveAddress = async () => {
    if (!addressForm.line1 || !addressForm.city || !addressForm.pincode) {
      toast.error("PLEASE FILL REQUIRED FIELDS");
      return;
    }

    if (user && !userData?.addresses?.some((a: any) => a.line1 === addressForm.line1)) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          addresses: arrayUnion(addressForm)
        });
        toast.success("SAVED TO ADDRESS BOOK!");
      } catch (e) {
        console.error("FAILED TO SAVE ADDRESS", e);
      }
    }

    setSelectedAddress(addressForm);
    setIsAddressModalOpen(false);
    toast.success("DELIVERY ADDRESS UPDATED!");
  };

  const displayAddress = selectedAddress
    ? `${selectedAddress.line1}, ${selectedAddress.city}`
    : "SET DELIVERY ADDRESS";

  const ProductCard = ({ product }: { product: Product }) => {
    const cartItem = cart.find(c => c.id === product.id);
    const outOfStock = product.stock <= 0;

    return (
      <div className={`flex flex-col gap-1 transition-all group ${outOfStock ? 'opacity-60 grayscale' : ''}`}>
        <div className="relative aspect-square bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-zinc-100 cursor-pointer shadow-sm" onClick={() => router.push(`/product/${product.id}`)}>
          <img className="w-full h-full p-2.5 object-contain group-hover:scale-105 transition-transform duration-500" src={product.image} alt={product.name} />
          <div className="absolute bottom-1 right-1">
            {outOfStock ? (
              <div className="bg-red-50 border border-red-100 text-red-600 px-2 py-1 rounded-lg text-[8px] font-black uppercase">
                Sold Out
              </div>
            ) : !cartItem ? (
              <button
                onClick={(e) => { e.stopPropagation(); addToCart({ ...product, quantity: 1 }); }}
                className="bg-white border-[1.2px] border-green-600 text-green-600 px-3 py-1 rounded-lg text-[9px] font-black hover:bg-green-600 hover:text-white transition-all active:scale-95"
              >
                Add
              </button>
            ) : (
              <div className="flex items-center bg-green-600 text-white rounded-lg px-0.5 py-0.5 shadow-md h-6" onClick={e => e.stopPropagation()}>
                <button onClick={() => updateQuantity(product.id, -1)} className="w-4 h-4 flex items-center justify-center hover:bg-black/10 rounded transition-colors">
                  <span className="material-symbols-outlined text-[10px] font-bold">remove</span>
                </button>
                <span className="w-3 text-center font-black text-[9px]">{cartItem.quantity}</span>
                <button onClick={() => updateQuantity(product.id, 1)} disabled={cartItem.quantity >= product.stock} className="w-4 h-4 flex items-center justify-center hover:bg-black/10 rounded transition-colors">
                  <span className="material-symbols-outlined text-[10px] font-bold">add</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col px-0.5 mt-0.5">
          <div className="flex items-center gap-1 mb-0.5 h-3.5">
            <span className="text-zinc-400 text-[9px] font-medium tracking-tight">1 Unit</span>
            {product.stock < 10 && product.stock > 0 && <span className="text-orange-600 text-[9px] font-bold tracking-tight">Only {product.stock} Left</span>}
          </div>
          <Link href={`/product/${product.id}`} className="text-[12px] font-bold text-zinc-900 leading-[1.2] mb-1.5 line-clamp-2 hover:text-green-700 tracking-tight" title={product.name}>
            {product.name}
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-black text-zinc-900 tracking-tighter">₹{product.price.toFixed(0)}</span>
            <span className="text-[9px] text-zinc-400 line-through font-medium tracking-tight opacity-50">₹{(product.price * 1.25).toFixed(0)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderPromoSections = (pos: PromoSection['position'] | "TOP" | "MIDDLE" | "BOTTOM", anchoredTo?: string) => {
    return (settings?.promoSections || [])
      .filter(s => s.section === activeSection && (s.position || "MIDDLE") === pos && (anchoredTo ? s.afterCategoryId === anchoredTo : !s.afterCategoryId))
      .map(section => {
        let content: React.ReactNode = null;
        const bgStyles: React.CSSProperties = {
          backgroundColor: section.bgColor || "#F3F4F6",
          backgroundImage: section.bgImageUrl ? `url(${section.bgImageUrl})` : `linear-gradient(135deg, ${section.bgColor} 0%, rgba(255,255,255,0.05) 100%)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        };

        const containerClasses = `relative overflow-hidden shadow-2xl transition-all duration-500 ${
          section.isCompact ? 'p-4 sm:p-5 rounded-[24px] sm:rounded-[32px]' : 'p-6 sm:p-8 rounded-[32px] sm:rounded-[40px]'
        } ${section.bgAnimation === 'zoom' ? 'hover:scale-[1.01]' : ''}`;

        if (section.type === "banner") {
          content = (
            <section key={section.id} className="px-4 mb-8">
              <div 
                className={`relative w-full aspect-[21/9] sm:aspect-[21/7] rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-xl cursor-pointer group ${section.bgAnimation === 'zoom' ? 'hover:scale-[1.02]' : ''}`} 
                onClick={() => section.items[0]?.redirectUrl && router.push(section.items[0].redirectUrl)}
              >
                <img 
                  src={section.items[0]?.imageUrl} 
                  alt={section.title || ""} 
                  className={`w-full h-full object-cover transition-transform duration-[20s] ease-linear ${section.bgAnimation === 'zoom' ? 'scale-110 group-hover:scale-100' : 'group-hover:scale-105'}`} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                {section.buttonText && (
                  <div className="absolute bottom-4 right-4 lg:bottom-8 lg:right-8 z-10">
                    <div className="px-6 py-2.5 rounded-full font-black text-[10px] lg:text-xs tracking-widest uppercase shadow-2xl hover:scale-105 transition-transform" style={{ backgroundColor: section.buttonColor || "#000", color: section.buttonTextColor || "#fff" }}>
                      {section.buttonText}
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        } else if (section.type === "grid") {
          content = (
            <section key={section.id} className="px-3 mb-6">
              <div className={containerClasses} style={bgStyles}>
                {section.bgImageUrl && <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] pointer-events-none" />}
                
                {section.title && (
                  <div className={`relative z-10 ${section.isCompact ? 'mb-3' : 'mb-6 sm:mb-8'}`}>
                    <h3 className={`font-headline font-black tracking-tighter uppercase drop-shadow-sm ${section.isCompact ? 'text-xl sm:text-2xl leading-none' : 'text-3xl sm:text-5xl'}`} style={{ color: section.textColor || "#18181b" }}>{section.title}</h3>
                  </div>
                )}
                
                <div className={`grid grid-cols-3 gap-2 sm:gap-3 relative z-10 ${section.isCompact ? 'auto-rows-[80px] sm:auto-rows-[110px]' : 'auto-rows-[100px] sm:auto-rows-[150px]'}`}>
                  {section.items.map((item, idx) => {
                    const cSpan = Math.min(item.colSpan || 1, 3);
                    const rSpan = Math.min(item.rowSpan || 1, 3);
                    
                    const colSpanClass = {
                      1: "col-span-1",
                      2: "col-span-2",
                      3: "col-span-3",
                    }[cSpan] || "col-span-1";
                    
                    const rowSpanClass = {
                      1: "row-span-1",
                      2: "row-span-2",
                      3: "row-span-3",
                    }[rSpan] || "row-span-1";

                    return (
                      <div key={idx} onClick={() => item.redirectUrl && router.push(item.redirectUrl)} className={`cursor-pointer group ${colSpanClass} ${rowSpanClass}`}>
                        <div className={`w-full h-full rounded-xl sm:rounded-[20px] bg-white shadow-sm overflow-hidden group-hover:scale-[1.02] transition-all duration-300 relative border border-black/5 p-[1px]`}>
                          <div className="w-full h-full rounded-lg sm:rounded-[14px] overflow-hidden bg-zinc-50 flex items-center justify-center relative">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.label || ""} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[10s]" />
                            ) : (
                              <div className="w-full h-full bg-black/5" />
                            )}
                            
                            {item.label && (
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                            )}
                          </div>
                          
                          {item.label && (
                            <div className="absolute bottom-2 left-2 right-2 z-10">
                              <h4 className="text-white font-black text-[9px] sm:text-[11px] uppercase tracking-tight leading-none drop-shadow-md group-hover:text-primary transition-colors">{item.label}</h4>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        } else if (section.type === "deal_row") {
          let dealProducts = filteredProducts.filter(p => section.priceLimit ? p.price <= section.priceLimit : true);
          
          if (section.manualProductIds && section.manualProductIds.length > 0) {
            const manualProds = section.manualProductIds.map(id => filteredProducts.find(p => p.id === id)).filter(Boolean) as typeof filteredProducts;
            const otherProds = dealProducts.filter(p => !section.manualProductIds?.includes(p.id));
            dealProducts = [...manualProds, ...otherProds];
          }
          
          if (dealProducts.length > 0) {
            content = (
              <section key={section.id} className="px-4 mb-10 w-full relative z-10">
                <div className="bg-zinc-50 rounded-[32px] overflow-hidden border border-zinc-200 shadow-sm flex h-[280px] sm:h-[320px]">
                  <div className="w-14 sm:w-16 bg-[#f3f9f3] border-r border-green-100 flex flex-col items-center justify-between py-6 relative overflow-hidden shrink-0">
                    <div className="w-[1.5px] h-12 bg-green-200 rounded-full shrink-0" />
                    <div className="flex-1 flex items-center justify-center w-full">
                      <div className="rotate-[-90deg] whitespace-nowrap">
                        <h3 className="text-[12px] sm:text-[15px] font-black tracking-[0.2em] uppercase text-green-950 leading-none italic drop-shadow-sm font-headline">
                          {section.title || "UNDER 19 STORE"}
                        </h3>
                      </div>
                    </div>
                    <div className="w-[1.5px] h-12 bg-green-200 rounded-full shrink-0" />
                  </div>
                  <div className="flex-1 flex overflow-x-auto hide-scrollbar gap-3 sm:gap-4 p-4 items-center snap-x">
                    {dealProducts.map(p => (
                      <div key={p.id} className={`${section.isCompact ? 'min-w-[130px] max-w-[130px]' : 'min-w-[150px] max-w-[150px]'} h-full snap-start shrink-0`}>
                        <div className="bg-white rounded-2xl p-2.5 h-full shadow-sm border border-white flex flex-col">
                          <div className="mb-2">
                            <span className="bg-green-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                              ₹{p.price.toFixed(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-h-0">
                            <ProductCard product={p} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="min-w-[100px] flex items-center justify-center snap-start shrink-0 pr-4">
                      <Link href="/search" className="w-16 h-16 rounded-full bg-green-600 flex flex-col items-center justify-center text-white shadow-lg active:scale-95 transition-transform group">
                        <span className="material-symbols-outlined text-2xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        <span className="text-[7px] font-black tracking-widest uppercase">All</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            );
          }
        } else if (section.type === "sliding_row") {
          let rowProducts = filteredProducts;
          
          if (section.filterType === "BESTSELLERS") {
            rowProducts = rowProducts.filter(p => p.isBestseller);
          } else if (section.filterType === "NEW_ARRIVALS") {
            rowProducts = [...rowProducts].sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return dateB - dateA;
            }).slice(0, 30);
          } else if (section.filterCategoryId) {
            rowProducts = rowProducts.filter(p => p.category === section.filterCategoryId || p.category === categories.find(c => c.id === section.filterCategoryId)?.label);
          }
          
          if (section.manualProductIds && section.manualProductIds.length > 0) {
            const manualProds = section.manualProductIds.map(id => filteredProducts.find(p => p.id === id)).filter(Boolean) as typeof filteredProducts;
            const otherProds = rowProducts.filter(p => !section.manualProductIds?.includes(p.id));
            rowProducts = [...manualProds, ...otherProds];
          }

          if (rowProducts.length > 0) {
            content = (
              <section key={section.id} className="mb-10 pl-4 w-full overflow-hidden">
                <div className="flex items-center justify-between mb-4 pr-4">
                  <h3 className="font-headline font-black text-lg tracking-tight text-zinc-900 flex items-center gap-2">
                    {section.iconUrl ? (
                      <img src={section.iconUrl} className="w-6 h-6 object-contain" alt="" />
                    ) : (
                      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL'1" }}>{section.filterType === 'NEW_ARRIVALS' ? 'verified' : 'local_fire_department'}</span>
                    )}
                    <span>{section.title || (section.filterType === 'BESTSELLERS' ? 'Bestsellers' : section.filterType === 'NEW_ARRIVALS' ? 'New Arrivals' : 'Trending')}</span>
                  </h3>
                </div>
                <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-4 pr-4 snap-x w-full pointer-events-auto">
                  {rowProducts.map(p => (
                    <div key={p.id} className="min-w-[135px] max-w-[135px] snap-start shrink-0">
                      <ProductCard product={p} />
                    </div>
                  ))}
                </div>
              </section>
            );
          }
        } else if (section.type === "category_grid") {
          content = (
            <section key={section.id} className="mt-4 mb-8">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-x-1 gap-y-6 px-2 justify-items-center">
                {filteredCategories.map(cat => (
                  <div key={cat.id} onClick={() => router.push(`/category/${cat.id}`)} className="flex flex-col items-center gap-2 cursor-pointer group w-full max-w-[85px]">
                    <div className="w-[60px] h-[60px] rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center p-0 overflow-hidden flex-shrink-0 group-hover:border-primary transition-all shadow-sm">
                      <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src={cat.img} alt={cat.label} />
                    </div>
                    <span className="text-[10px] font-bold tracking-tight text-center text-zinc-900 group-hover:text-primary leading-tight w-full break-words min-h-[2.4em] flex items-center justify-center px-1">{cat.label}</span>
                  </div>
                ))}
              </div>
            </section>
          );
        } else {
          content = (
            <section key={section.id} className={section.type === "sliding_row" ? "mb-10 pl-4 w-full overflow-hidden" : "mb-12 px-4"}>
              <div style={bgStyles} className={containerClasses}>
                 {section.type === "banner" && (
                   <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                     {section.title && <h3 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase" style={{ color: section.textColor }}>{section.title}</h3>}
                     {section.subtitle && <p className="text-sm sm:text-lg font-bold opacity-80 uppercase" style={{ color: section.textColor }}>{section.subtitle}</p>}
                     {section.buttonText && (
                       <button className="px-6 py-3 rounded-xl font-black text-xs tracking-widest uppercase transition-all hover:scale-105 active:scale-95 shadow-lg" style={{ backgroundColor: section.buttonColor, color: section.buttonTextColor }}>
                         {section.buttonText}
                       </button>
                     )}
                   </div>
                 )}
                 {section.type === "grid" && (
                   <div className="relative z-10 space-y-6">
                     {section.title && (
                       <div className="flex items-center justify-between">
                         <h3 className="text-xl sm:text-2xl font-black tracking-tight uppercase" style={{ color: section.textColor }}>{section.title}</h3>
                         {section.subtitle && <span className="text-[10px] font-black tracking-widest opacity-60 uppercase" style={{ color: section.textColor }}>{section.subtitle}</span>}
                       </div>
                     )}
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                       {section.items.map((item, i) => (
                         <Link key={i} href={item.redirectUrl || "#"} 
                           className={`relative overflow-hidden rounded-2xl group shadow-md hover:shadow-xl transition-all duration-300 ${
                             item.colSpan === 2 ? 'col-span-2' : 'col-span-1'
                           } ${item.rowSpan === 2 ? 'row-span-2 aspect-[1/2]' : 'aspect-square'}`}
                         >
                           <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={item.label || ""} />
                           {item.label && (
                             <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                               <span className="text-[10px] font-black text-white tracking-widest uppercase">{item.label}</span>
                             </div>
                           )}
                         </Link>
                       ))}
                     </div>
                   </div>
                 )}
              </div>
            </section>
          );
        }

        return (
          <React.Fragment key={section.id}>
            {content}
            {renderPromoSections("MIDDLE", section.id)}
          </React.Fragment>
        );
    });
  };

  if (settingsLoading) {
    return (
      <div className="min-h-[100dvh] bg-white flex items-center justify-center space-x-2">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
      </div>
    );
  }

  if (!authLoading && user && role !== 'customer') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative transition-colors duration-700 ${activeSection === 'CAFE' ? 'bg-[#FAF7F2]' : 'bg-white'}`}>
      <div className={`fixed top-0 left-0 w-full flex flex-col z-[60] transition-colors duration-500 ${activeSection === 'CAFE' ? 'bg-[#2D1B14] text-[#EAD8C0]' : 'bg-black text-white'}`}>
        <div className="pt-safe" />
        <div className="h-8 flex items-center overflow-hidden">
          <div className="flex whitespace-nowrap animate-marquee">
            <span className="text-[10px] font-bold tracking-widest px-4">{(settings?.sectionSettings?.[activeSection]?.announcement || settings?.announcement) || "⚡️ Instant Delivery Available • Curated Premium Selections ⚡️"}</span>
            <span className="text-[10px] font-bold tracking-widest px-4">{(settings?.sectionSettings?.[activeSection]?.announcement || settings?.announcement) || "⚡️ Instant Delivery Available • Curated Premium Selections ⚡️"}</span>
          </div>
        </div>
      </div>

      <header className={`fixed top-[calc(theme(spacing.8)+max(env(safe-area-inset-top),2rem))] w-full z-50 transition-all border-b ${activeSection === 'CAFE' ? 'border-[#EAD8C0]/20' : 'border-zinc-100'}`}>
        {/* Top area with neutral background */}
        <div className={`pt-4 px-4 flex flex-col transition-colors duration-500 ${activeSection === 'CAFE' ? 'bg-[#FAF7F2]/80 backdrop-blur-xl' : 'bg-zinc-100'}`}>
          {/* Top Row: Address and Account */}
          <div className="flex items-center justify-between w-full mb-5">
            <div className="flex flex-col">
              <div className="flex items-center gap-1 cursor-pointer group" onClick={() => setIsAddressModalOpen(true)}>
                <span className="text-[13px] font-black text-zinc-900 tracking-tight uppercase group-hover:text-primary transition-colors">
                  {displayAddress}
                </span>
                <span className="material-symbols-outlined text-[18px] text-zinc-900 font-bold group-hover:text-primary transition-colors">expand_more</span>
              </div>
            </div>
            <div className="flex items-center">
              <Link href={user ? "/profile" : "/login"} className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-900 hover:bg-zinc-200 transition-all shadow-sm">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL'1" }}>{user ? 'account_circle' : 'login'}</span>
              </Link>
            </div>
          </div>

          {/* Section Tabs (Bazaarbolt Style) */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar items-end">
            <button
              onClick={() => setActiveSection("BB")}
              className={`flex-shrink-0 px-6 py-2.5 text-[15px] font-black tracking-tighter transition-all flex items-center justify-center min-w-[100px] lowercase ${activeSection === "BB" ? "bg-white rounded-t-xl shadow-[0_-4px_12px_rgba(0,0,0,0.03)]" : "bg-transparent opacity-50 hover:opacity-100"}`}
            >
              <span className="text-primary font-black">bazaar</span><span className="text-zinc-900 font-medium">bolt</span>
            </button>
            <button
              onClick={() => setActiveSection("CAFE")}
              className={`flex-shrink-0 px-6 py-2.5 text-[15px] font-black tracking-tighter transition-all flex items-center justify-center min-w-[100px] lowercase ${activeSection === "CAFE" ? "bg-[#FAF7F2] border-t border-x border-[#EAD8C0]/30 rounded-t-xl" : "bg-transparent opacity-50 hover:opacity-100"}`}
            >
              <span className="text-[#8B5E3C] font-black">bb&nbsp;</span><span className="text-[#2D1B14] font-medium">cafe</span>
            </button>
          </div>
        </div>

        {/* Search Bar area with exact same bg as active tab to seamlessly connect */}
        <div className={`px-4 py-3 border-b transition-colors duration-500 ${activeSection === 'CAFE' ? 'bg-[#FAF7F2] border-[#EAD8C0]/20' : 'bg-white border-zinc-100'}`}>
          <div onClick={() => router.push(`/search?section=${activeSection}`)} className={`rounded-[16px] flex items-center px-4 py-2.5 gap-3 cursor-pointer shadow-sm border transition-all ${activeSection === 'CAFE' ? 'bg-[#FFFBF5] border-[#EAD8C0]/40' : 'bg-white border-zinc-200'}`}>
            <span className={`material-symbols-outlined text-xl font-bold ${activeSection === 'CAFE' ? 'text-[#8B5E3C]' : 'text-zinc-400'}`}>search</span>
            <span className={`text-[12px] font-bold tracking-tight ${activeSection === 'CAFE' ? 'text-[#8B5E3C]/60' : 'text-zinc-400'}`}>Search for "{activeSection === "CAFE" ? "Cold Brew" : "Safai Abhiyaan"}"</span>
          </div>
        </div>
      </header>

      <main className={`pt-[calc(280px+env(safe-area-inset-top,0px))] pb-16 overflow-x-hidden min-h-[100dvh] transition-colors duration-500 ${activeSection === 'CAFE' ? 'bg-[#FAF7F2]' : 'bg-white'}`}>
        {(settings?.sectionSettings?.[activeSection]?.storeOpen ?? settings?.storeOpen) === false ? (
          <section className="px-6 py-20 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-700">
            <h2 className="text-5xl font-headline font-black text-zinc-900 tracking-tighter leading-[0.8] mb-8">Currently <br /><span className="text-primary">Unavailable</span></h2>
            <p className="max-w-xs mx-auto text-[10px] font-bold text-zinc-400 tracking-[0.2em] leading-relaxed mb-12">We're Not Serving This Area At The Moment.</p>
          </section>
        ) : (
          <>
            {/* Dynamic Promo Sections - VERY TOP */}
            {renderPromoSections("TOP")}

            {/* Falling back to default category grid if no custom category_grid is defined for this section */}
            {(!settings?.promoSections || !settings.promoSections.some(s => s.section === activeSection && s.type === "category_grid")) && (
              <section className="mt-8 mb-12">
                <div className="grid grid-cols-4 gap-x-1 gap-y-10 px-1 justify-items-center max-w-4xl mx-auto">
                  {filteredCategories.map(cat => (
                    <div key={cat.id} onClick={() => router.push(`/category/${cat.id}`)} className="flex flex-col items-center gap-2 cursor-pointer group w-full">
                      <div className="w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center p-0 overflow-hidden flex-shrink-0 group-hover:border-primary transition-all shadow-sm">
                        <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src={cat.img} alt={cat.label} />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-bold tracking-tight text-center text-zinc-900 group-hover:text-primary leading-tight w-full break-words min-h-[2.4em] flex items-center justify-center px-0.5">{cat.label}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="px-4 mb-8">
              <div className={`relative w-full aspect-[21/12] rounded-[40px] overflow-hidden shadow-2xl transition-all duration-500 ${activeSection === 'CAFE' ? 'bg-[#EAD8C0]/20' : 'bg-zinc-100'}`}>
                {BANNERS.map((banner, idx) => (
                  <div
                    key={idx}
                    onClick={() => banner.redirectUrl && router.push(banner.redirectUrl)}
                    className={`absolute inset-0 transition-all duration-1000 ${banner.redirectUrl ? 'cursor-pointer' : ''} ${idx === currentBannerIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}
                  >
                    <img className="w-full h-full object-cover" src={banner.url} alt={banner.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                      <p className="text-[12px] font-black tracking-widest text-white/70 mb-1">{banner.subtitle}</p>
                      <h2 className="text-2xl font-black text-white tracking-tighter leading-none">{banner.title}</h2>
                    </div>
                  </div>
                ))}
                {BANNERS.length > 1 && (
                  <div className="absolute bottom-4 left-6 flex gap-1.5 z-10">
                    {BANNERS.map((_, idx) => (
                      <div key={idx} className={`h-1 rounded-full transition-all duration-300 ${idx === currentBannerIndex ? 'w-6 bg-white' : 'w-1 bg-white/40'}`} />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Dynamic Promo Sections - MIDDLE */}
            {renderPromoSections("AFTER_HERO")}
            {renderPromoSections("AFTER_BESTSELLERS")}
            {renderPromoSections("AFTER_NEW_ARRIVALS")}
            {renderPromoSections("MIDDLE")}

            {/* Dynamic Promo Sections - BOTTOM */}
            {renderPromoSections("AFTER_CATEGORIES")}
            {renderPromoSections("BOTTOM")}

            <section className="px-4 mb-8">
              <AdUnit slotId="home-mid-banner" className="m-0" />
            </section>

            <footer className="mt-8 px-6 pb-20 text-center">
              <h2 className="font-headline font-black text-2xl text-zinc-900 tracking-tighter mb-4 opacity-40">Comfort in every cart</h2>
              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="h-[1px] w-12 bg-zinc-200 opacity-40" />
                <Logo size="sm" className="opacity-40" />
                <div className="h-[1px] w-12 bg-zinc-200 opacity-40" />
              </div>
            </footer>
          </>
        )}
      </main>

      {isAddressModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsAddressModalOpen(false)}></div>
            <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-500 relative z-10 max-h-[90vh] flex flex-col pointer-events-auto">
              <button onClick={() => setIsAddressModalOpen(false)} className="absolute top-6 right-6 w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors z-20">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
              <div className="absolute top-0 right-0 p-10 opacity-5 -z-10 pointer-events-none border-b border-white"><span className="material-symbols-outlined text-[140px]">location_on</span></div>
              <div className="flex-shrink-0 flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-4xl font-headline font-black text-zinc-900 tracking-tighter leading-none">Select address</h2>
                  <p className="text-[10px] font-bold text-zinc-400 tracking-widest mt-2">Where should we bolt your order?</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-6">
                {userData?.addresses?.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black tracking-widest text-zinc-400 ml-1 block">Saved addresses</label>
                    <div className="grid grid-cols-1 gap-2">
                      {userData.addresses.map((addr: Address, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => { setSelectedAddress(addr); setIsAddressModalOpen(false); }}
                          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 ${selectedAddress?.line1 === addr.line1 ? 'bg-primary/5 border-primary shadow-sm' : 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'}`}
                        >
                          <span className="material-symbols-outlined text-zinc-400">home</span>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-zinc-900">{addr.city}</span>
                            <span className="text-[9px] font-bold text-zinc-400 truncate max-w-[200px]">{addr.line1}</span>
                          </div>
                          {selectedAddress?.line1 === addr.line1 && <span className="material-symbols-outlined ml-auto text-primary text-sm">check_circle</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-zinc-100">
                  <button onClick={() => { setAddressForm({ line1: "", line2: "", city: "Chevella", pincode: "", landmark: "" }); }} className="flex items-center gap-2 text-primary font-black text-[10px] tracking-widest mb-6">
                    <span className="material-symbols-outlined text-lg">add_circle</span>
                    Add a New Address
                  </button>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black tracking-widest text-zinc-400 ml-1 block">Building / house no.</label>
                      <input type="text" placeholder="Flat no, house name, street" className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-4 ring-primary/20 transition-all placeholder:text-zinc-300" value={addressForm.line1} onChange={e => setAddressForm({ ...addressForm, line1: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black tracking-widest text-zinc-400 ml-1 block">City</label>
                        <input type="text" readOnly className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm text-zinc-500 cursor-not-allowed" value={addressForm.city} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black tracking-widest text-zinc-400 ml-1 block">Pincode</label>
                        <input type="number" placeholder="110001" className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-4 ring-primary/20 transition-all" value={addressForm.pincode} onChange={e => setAddressForm({ ...addressForm, pincode: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-6">
                    <button onClick={() => setIsAddressModalOpen(false)} className="flex-1 bg-zinc-100 text-zinc-500 py-5 rounded-3xl font-black tracking-widest text-[10px] transition-all hover:bg-zinc-200">Cancel</button>
                    <button onClick={handleSaveAddress} className="flex-1 bg-zinc-900 text-white py-5 rounded-3xl font-black tracking-widest text-[10px] transition-all hover:bg-black shadow-xl shadow-zinc-900/10">Save & Use</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {pendingRatingOrder && (
        <Portal>
          <div className="fixed inset-0 z-[200] bg-zinc-950/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white max-w-md w-full rounded-[40px] p-8 shadow-2xl relative animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-500 overflow-hidden pointer-events-auto">
              <button onClick={() => setPendingRatingOrder(null)} className="absolute top-6 right-6 w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors z-10">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
              <div className="text-center mb-8 relative">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL'1" }}>star</span>
                </div>
                <h2 className="text-2xl font-headline font-black text-zinc-900 tracking-tight leading-none mb-2">How was your order?</h2>
                <p className="text-[10px] font-black text-zinc-400 tracking-[0.1em] uppercase">Rate these items and help us make customers happier!</p>
              </div>

              <div className="space-y-4 max-h-[40vh] overflow-y-auto mb-8 pr-2 custom-scrollbar">
                {pendingRatingOrder.items.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="flex items-center gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                    <div className="w-12 h-12 flex-shrink-0 bg-white p-1 shadow-sm rounded-lg border border-zinc-100"><img src={item.image} alt={item.name} className="w-full h-full object-contain" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-zinc-900 truncate leading-none mb-2">{item.name}</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button key={star} onClick={() => setRatings({ ...ratings, [item.id]: star })}>
                            <span className={`material-symbols-outlined text-2xl ${ratings[item.id] >= star ? 'text-yellow-400' : 'text-zinc-200'} active:scale-95 transition-transform`} style={{ fontVariationSettings: "'FILL'1" }}>star</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={submitRating}
                className="w-full bg-primary text-zinc-900 font-headline font-black text-sm tracking-widest py-4 rounded-2xl hover:bg-green-500 shadow-xl shadow-primary/20 transition-all active:scale-95"
              >
                Submit Ratings
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
