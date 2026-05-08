"use client";

import React, { useEffect, useState, useRef } from "react";
import { useStore } from "@/store/useStore";
import { collection, onSnapshot, query, where, doc, updateDoc, arrayUnion, getDocs, limit, orderBy, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, Address, Order, PromoSection } from "@/types";
import { mapOrder } from "@/lib/mappers";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { Portal } from "@/components/Portal";
import { ProductBottomSheet } from "@/components/ProductBottomSheet";
const InfiniteBannerSlider = ({ section, router }: { section: any; router: any }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const items = section.items || [];
  const isSingle = items.length <= 1;
  const [hasScrolled, setHasScrolled] = useState(false);

  // Duplicate items many times to create a fake infinite scroll loop
  const repeatedItems = isSingle ? items : Array(20).fill(items).flat();

  useEffect(() => {
    if (isSingle || !scrollRef.current || hasScrolled) return;
    
    const container = scrollRef.current;
    // Start at the 10th set so user can scroll left or right infinitely practically
    const startIndex = items.length * 10; 
    
    const timer = setTimeout(() => {
      const child = container.children[startIndex] as HTMLElement;
      if (child) {
        const scrollPos = child.offsetLeft - container.clientWidth / 2 + child.clientWidth / 2;
        container.scrollTo({ left: scrollPos, behavior: 'auto' });
        setHasScrolled(true);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [items.length, isSingle, hasScrolled]);

  // Auto-play logic
  useEffect(() => {
    if (isSingle || !scrollRef.current || !hasScrolled) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const container = scrollRef.current;
        const scrollAmount = container.clientWidth * 0.8;
        const newPos = container.scrollLeft + scrollAmount;
        
        container.scrollTo({
          left: newPos,
          behavior: 'smooth'
        });

        // Loop back if we've scrolled too far (infinite effect)
        if (container.scrollLeft > (container.scrollWidth / 2)) {
          container.scrollTo({ left: container.scrollLeft - (container.scrollWidth / 4), behavior: 'auto' });
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isSingle, hasScrolled]);

  return (
    <div 
      ref={scrollRef}
      className="flex overflow-x-auto hide-scrollbar gap-4 snap-x snap-mandatory relative scroll-smooth"
      style={{ paddingInline: isSingle ? '1rem' : 'max(10vw, calc(50vw - 400px))' }}
    >
      {repeatedItems.map((item: any, idx: number) => (
        <div 
          key={idx}
          className={`relative ${isSingle ? 'w-full' : 'w-[85vw] max-w-[800px]'} shrink-0 snap-center aspect-[16/9] sm:aspect-[21/9] rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-xl cursor-pointer group ${section.bgAnimation === 'zoom' ? 'hover:scale-[1.02]' : ''}`} 
          onClick={() => item?.redirectUrl && router.push(item.redirectUrl)}
        >
          <img 
            src={item?.imageUrl} 
            alt={section.title || ""} 
            className={`w-full h-full object-cover transition-transform duration-[20s] ease-linear ${section.bgAnimation === 'zoom' ? 'scale-110 group-hover:scale-100' : 'group-hover:scale-105'}`} 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
        </div>
      ))}
    </div>
  );
};

export default function Home() {
  const {
    settings, initSettings, settingsLoading,
    products, categories, catalogLoading, fetchCatalog,
    cart, addToCart, updateQuantity, selectedAddress, setSelectedAddress
  } = useStore();
  const { user, role, loading: authLoading, userData } = useAuth();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<"BB" | "CAFE" | "MALL">("BB");

  const availableSections = [
    ...(settings?.activeSections?.BB !== false ? [{ id: 'BB' as const, label: 'BAZAAR', sub: 'BOLT', colorClass: 'text-primary' }] : []),
    ...(settings?.activeSections?.CAFE !== false ? [{ id: 'CAFE' as const, label: 'BB', sub: 'CAFE', colorClass: 'text-[#8B5E3C]' }] : []),
    ...(settings?.activeSections?.MALL !== false ? [{ id: 'MALL' as const, label: 'BB', sub: 'CENTRAL', colorClass: 'text-indigo-500' }] : [])
  ];

  useEffect(() => {
    if (availableSections.length > 0 && !availableSections.find(s => s.id === activeSection)) {
      setActiveSection(availableSections[0].id);
    }
  }, [settings?.activeSections, activeSection]);

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

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false);
  const [sheetProductsContext, setSheetProductsContext] = useState<Product[] | null>(null);

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

  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 400);
    return () => clearTimeout(timer);
  }, [activeSection]);

  useEffect(() => {
    if (BANNERS.length <= 1) {
      setCurrentBannerIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % BANNERS.length);
    }, 3500);
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

  const ProductCard = ({ product, contextProducts }: { product: Product, contextProducts?: Product[] }) => {
    const cartItem = cart.find(c => c.id === product.id);
    const outOfStock = product.stock <= 0;

    return (
      <div className={`flex flex-col gap-0.5 transition-all group ${outOfStock ? 'opacity-60 grayscale' : ''}`}>
        <div className="relative aspect-square bg-white rounded-md sm:rounded-lg overflow-hidden border border-zinc-100 cursor-pointer shadow-sm" onClick={() => { setSelectedProductId(product.id); setSheetProductsContext(contextProducts || null); setIsProductSheetOpen(true); }}>
          <img className="w-full h-full p-2 object-contain group-hover:scale-105 transition-transform duration-500" src={product.image} alt={product.name} />
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
        <div className="flex flex-col px-1 pt-1">
          <div className="flex items-center gap-1 h-3">
            <span className="text-zinc-400 text-[9px] font-semibold tracking-tight whitespace-nowrap">1 unit</span>
          </div>
          <Link href={`/product/${product.id}`} className="text-[11px] font-bold text-zinc-900 leading-[1.2] mb-1 line-clamp-2 hover:text-green-700 tracking-tight" title={product.name}>
            {product.name}
          </Link>
          <div className="flex items-center gap-1 mt-auto">
            <span className="text-xs font-bold text-zinc-900 tracking-tighter">₹{product.price.toFixed(0)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderPromoSections = (pos: string, anchoredTo?: string) => {
    return (settings?.promoSections || [])
      .filter(s => {
        const isMatchesSection = s.section === activeSection || (!s.section && activeSection === "BB");
        
        if (anchoredTo) {
          return isMatchesSection && s.afterCategoryId === anchoredTo;
        }

        const isMatchesPosition = (s.position || "MIDDLE") === pos;
        
        // Root level call: render sections that are not anchored to an ACTIVE category OR another ACTIVE section
        const isAnchoredToActiveCategory = categories.some(c => {
          const isTargetCat = c.id === s.afterCategoryId;
          const isTargetSub = c.subcategories?.some((sub: any) => (typeof sub === 'string' ? sub : (sub.id || sub.label)) === s.afterCategoryId);
          return (isTargetCat || isTargetSub) && ((c as any).section || "BB") === activeSection;
        });
        const isAnchoredToActiveSection = settings?.promoSections?.some(other => other.id === s.afterCategoryId && (other.section === activeSection || (!other.section && activeSection === "BB")));
        
        return isMatchesSection && isMatchesPosition && !isAnchoredToActiveCategory && !isAnchoredToActiveSection;
      })
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
            <section key={section.id} className="mb-8 w-full overflow-hidden">
              <InfiniteBannerSlider section={section} router={router} />
            </section>
          );
        } else if (section.type === "grid") {
          content = (
            <section key={section.id} className="px-4 mb-8">
              <div className={`${containerClasses} relative`} style={bgStyles}>
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                
                {section.title && (
                  <div className={`relative z-10 flex items-center gap-3 ${section.isCompact ? 'mb-4' : 'mb-8'}`}>
                    <div className="w-1.5 h-6 rounded-full shadow-sm" style={{ backgroundColor: section.textColor || "#18181b" }} />
                    <h3 className={`font-headline font-extrabold tracking-tight drop-shadow-md ${section.isCompact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}`} style={{ color: section.textColor || "#18181b" }}>
                      {section.title}
                    </h3>
                  </div>
                )}
                
                <div className={`grid grid-cols-3 gap-2 sm:gap-6 relative z-10 ${section.isCompact ? 'auto-rows-[120px] sm:auto-rows-[160px]' : 'auto-rows-[130px] sm:auto-rows-[200px]'}`}>
                  {section.items.map((item, idx) => {
                    const cSpan = Math.min(item.colSpan || 1, 3);
                    const rSpan = Math.min(item.rowSpan || 1, 3);
                    const colSpanClass = { 1: "col-span-1", 2: "col-span-2", 3: "col-span-3" }[cSpan] || "col-span-1";
                    const rowSpanClass = { 1: "row-span-1", 2: "row-span-2", 3: "row-span-3" }[rSpan] || "row-span-1";

                    const isPrice = item.label?.includes('₹');

                    return (
                      <div key={idx} onClick={() => item.redirectUrl && router.push(item.redirectUrl)} className={`cursor-pointer group ${colSpanClass} ${rowSpanClass} relative`}>
                        <div className="w-full h-full flex flex-col bg-white/10 backdrop-blur-md rounded-[32px] border-2 border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] group-hover:scale-[1.02] transition-all duration-500 overflow-hidden relative">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.label || ""} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          ) : (
                            <div className="absolute inset-0 w-full h-full bg-zinc-50" />
                          )}

                          {item.label && (
                            <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/50 via-transparent to-transparent">
                              <h4 className="font-headline font-extrabold text-[10px] sm:text-[12px] tracking-tight leading-none text-white drop-shadow-lg transition-all group-hover:translate-x-1">
                                {item.label.replace(/₹\d+/, '').trim()}
                              </h4>
                            </div>
                          )}
                          
                          {isPrice && (
                            <div className="absolute bottom-4 right-4 bg-zinc-900 text-white px-4 py-1.5 rounded-full shadow-2xl border border-white/20 transform rotate-[-2deg] group-hover:rotate-0 transition-transform z-20">
                              <span className="text-[12px] sm:text-[14px] font-black tracking-tight font-headline">
                                {item.label.match(/₹\d+/)?.[0]}
                              </span>
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
          let dealProducts = filteredProducts.filter(p => {
            const matchesPrice = section.priceLimit ? p.price <= section.priceLimit : true;
            if (!matchesPrice) return false;
            if (!section.filterCategoryId) return true;
            
            const target = section.filterCategoryId.toLowerCase().trim();
            const categoriesList = Array.isArray(p.category) ? p.category : [p.category];
            const subcategoriesList = Array.isArray(p.subcategory) ? p.subcategory : [p.subcategory || ""];
            const cat = categories.find(c => c.id === section.filterCategoryId);
            const catLabel = cat?.label?.toLowerCase().trim();

            const isCatMatch = categoriesList.some(c => c?.toLowerCase().trim() === target || c?.toLowerCase().trim() === catLabel);
            const isSubMatch = subcategoriesList.some(sub => {
              const pSub = sub?.toLowerCase().trim();
              if (pSub === target) return true;
              return categories.some(c => 
                c.subcategories?.some((s: any) => {
                  const sId = (typeof s === 'string' ? s : (s.id || s.label)).toLowerCase().trim();
                  return sId === target && pSub === (typeof s === 'string' ? s : s.label).toLowerCase().trim();
                })
              );
            });
            
            return isCatMatch || isSubMatch;
          });
          
          if (section.manualProductIds && section.manualProductIds.length > 0) {
            const manualProds = section.manualProductIds.map(id => filteredProducts.find(p => p.id === id)).filter(Boolean) as typeof filteredProducts;
            const otherProds = dealProducts.filter(p => !section.manualProductIds?.includes(p.id));
            dealProducts = [...manualProds, ...otherProds];
          }
          
          if (dealProducts.length > 0) {
            content = (
              <section key={section.id} className="px-3 sm:px-4 mb-10 w-full relative">
                <div className="bg-[#f2faf5] rounded-[32px] pt-16 pb-6 border-b-4 border-emerald-100 shadow-[0_25px_70px_rgba(0,0,0,0.08)] relative overflow-visible">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none rounded-t-[32px] overflow-hidden">
                    <div className="h-10 flex shadow-md">
                      {[...Array(10)].map((_, i) => <div key={i} className={`flex-1 h-full ${i % 2 === 0 ? 'bg-emerald-600' : 'bg-emerald-500'}`} />)}
                    </div>
                    <div className="flex h-6 px-0.5">
                      {[...Array(12)].map((_, i) => <div key={i} className="flex-1 h-full bg-emerald-600 rounded-b-full shadow-inner border-t border-emerald-500/20 -mx-[1px]" />)}
                    </div>
                  </div>
                  <div className="absolute top-10 left-0 right-0 z-40 flex flex-col items-center pointer-events-none animate-sway">
                    <div className="w-16 h-8 flex justify-between px-6 relative">
                      {[0, 1].map((i) => <div key={i} className="w-[1.5px] h-full bg-emerald-950/50 relative" />)}
                    </div>
                    <div className="bg-white border-2 border-emerald-950 px-6 py-2 rounded-xl shadow-2xl pointer-events-auto -mt-1 relative overflow-visible">
                      <h3 className="text-emerald-950 font-headline font-black text-sm sm:text-base tracking-tighter uppercase leading-none px-2">
                        DEALS AT ₹{section.priceLimit || 99}
                      </h3>
                    </div>
                  </div>
                  {/* Products */}
                  <div className="relative z-10 px-3 sm:px-6 mt-16">
                    <div className={section.layout === 'max4row' ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4" : "flex overflow-x-auto hide-scrollbar gap-4 items-stretch snap-x"}>
                      {(section.layout === 'max4row' ? dealProducts.slice(0, 12) : dealProducts.slice(0, 15)).map((p, idx) => (
                        <div key={p.id} className={section.layout === 'max4row' ? "w-full" : "min-w-[110px] max-w-[110px] snap-start shrink-0 h-full"}>
                          <div className="flex flex-col h-full relative group/item animate-in fade-in slide-in-from-bottom-4 fill-mode-both" style={{ animationDelay: `${idx * 80}ms` }}>
                            <div className="absolute top-0 left-0 z-10 flex flex-col gap-0.5 pointer-events-none -ml-1 -mt-1">
                              <div className="bg-emerald-600 text-white text-[8px] font-black px-2 py-0.5 rounded-br-lg rounded-tl-xl shadow-md border border-white/20">₹{p.price.toFixed(0)}</div>
                            </div>
                            <div className="flex-1 bg-white rounded-2xl p-1 border border-emerald-50 hover:border-emerald-200 transition-all duration-500 shadow-sm">
                              <ProductCard product={p} contextProducts={section.layout === 'max4row' ? dealProducts.slice(0, 12) : dealProducts.slice(0, 15)} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {section.layout === 'max4row' && dealProducts.length > 12 && (
                      <div className="mt-8 flex justify-center">
                        <button 
                          onClick={() => router.push(section.filterCategoryId ? `/category/${section.filterCategoryId}` : `/search?section=${activeSection}`)}
                          className="w-full py-4 bg-white/80 backdrop-blur-sm border-2 border-emerald-100 rounded-2xl text-[10px] font-black text-emerald-800 uppercase tracking-widest hover:bg-emerald-50 transition-all active:scale-[0.98] shadow-md flex items-center justify-center gap-2 group"
                        >
                          View All Deals
                          <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </button>
                      </div>
                    )}
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
            rowProducts = [...rowProducts].sort((a, b) => 
              new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            ).slice(0, 30);
          }

          if (section.filterCategoryId) {
            const target = section.filterCategoryId.toLowerCase().trim();
            rowProducts = rowProducts.filter(p => {
              const categoriesList = Array.isArray(p.category) ? p.category : [p.category];
              const subcategoriesList = Array.isArray(p.subcategory) ? p.subcategory : [p.subcategory || ""];
              const cat = categories.find(c => c.id === section.filterCategoryId);
              const catLabel = cat?.label?.toLowerCase().trim();

              const isCatMatch = categoriesList.some(c => c?.toLowerCase().trim() === target || c?.toLowerCase().trim() === catLabel);
              const isSubMatch = subcategoriesList.some(sub => {
                const pSub = sub?.toLowerCase().trim();
                if (pSub === target) return true;
                return categories.some(c => 
                  c.subcategories?.some((s: any) => {
                    const sId = (typeof s === 'string' ? s : (s.id || s.label)).toLowerCase().trim();
                    const sLabel = (typeof s === 'string' ? s : s.label).toLowerCase().trim();
                    return sId === target && pSub === sLabel;
                  })
                );
              });
              return isCatMatch || isSubMatch;
            });
          }
          if (section.manualProductIds?.length) {
            const manualProds = section.manualProductIds.map(id => filteredProducts.find(p => p.id === id)).filter(Boolean) as typeof filteredProducts;
            rowProducts = [...manualProds, ...rowProducts.filter(p => !section.manualProductIds?.includes(p.id))];
          }
          if (rowProducts.length > 0) {
            content = (
              <section key={section.id} className="mb-10 pl-4 w-full overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-headline font-black text-lg lg:text-xl tracking-tight text-zinc-900 flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-primary rounded-full" />
                    <span>{section.title || (section.filterType === 'BESTSELLERS' ? 'Bestsellers' : section.filterType === 'NEW_ARRIVALS' ? 'New Arrivals' : 'Trending')}</span>
                  </h3>
                </div>
                <div className={section.layout === 'max4row' ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pb-4 pr-4 w-full" : "flex overflow-x-auto hide-scrollbar gap-3 pb-4 pr-4 snap-x w-full pointer-events-auto"}>
                  {(section.layout === 'max4row' ? rowProducts.slice(0, 12) : rowProducts).map(p => (
                    <div key={p.id} className={section.layout === 'max4row' ? "w-full" : "min-w-[105px] max-w-[105px] snap-start shrink-0"}>
                      <ProductCard product={p} contextProducts={section.layout === 'max4row' ? rowProducts.slice(0, 12) : rowProducts} />
                    </div>
                  ))}
                </div>
                {section.layout === 'max4row' && rowProducts.length > 12 && (
                  <div className="mt-4 pr-4">
                    <button 
                      onClick={() => router.push(section.filterCategoryId ? `/category/${section.filterCategoryId}` : `/search?section=${activeSection}`)}
                      className={`w-full py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase transition-all active:scale-[0.97] border shadow-sm flex items-center justify-center gap-2 ${
                        activeSection === 'CAFE' 
                          ? 'bg-[#FAF7F2] border-[#EAD8C0] text-[#8B5E3C] hover:bg-[#EAD8C0]/20' 
                          : activeSection === 'MALL'
                          ? 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100'
                          : 'bg-zinc-50 border-zinc-100 text-zinc-900 hover:bg-zinc-100'
                      }`}
                    >
                      View All
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  </div>
                )}
              </section>
            );
          }
        } else if (section.type === "category_grid") {
          content = (
            <React.Fragment key={section.id}>
              {renderCategorySections(section)}
            </React.Fragment>
          );
        } else {
          content = (
            <section key={section.id} className={section.type === "sliding_row" ? "mb-10 pl-4 w-full overflow-hidden" : "mb-12 px-4"}>
              <div style={bgStyles} className={containerClasses}>
                 {section.type === "banner" && (
                   <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                     {section.title && <h3 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase" style={{ color: section.textColor }}>{section.title}</h3>}
                     {section.subtitle && <p className="text-sm sm:text-lg font-bold opacity-80 uppercase" style={{ color: section.textColor }}>{section.subtitle}</p>}
                   </div>
                 )}
                 {section.type === "grid" && (
                   <div className="relative z-10 space-y-6">
                     {section.title && (
                       <div className="flex items-center justify-between">
                         <h3 className="text-xl sm:text-2xl font-black tracking-tight uppercase" style={{ color: section.textColor }}>{section.title}</h3>
                       </div>
                     )}
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                       {section.items.map((item, i) => (
                         <Link key={i} href={item.redirectUrl || "#"} className={`relative overflow-hidden rounded-2xl group shadow-md hover:shadow-xl transition-all duration-300 ${item.colSpan === 2 ? 'col-span-2' : 'col-span-1'} ${item.rowSpan === 2 ? 'row-span-2 aspect-[1/2]' : 'aspect-square'}`}>
                           <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
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

  const renderCategorySections = (promoSection?: PromoSection) => {
    const isMax4Row = promoSection?.layout === 'max4row';
    const limit = isMax4Row ? 16 : filteredCategories.length;
    const items = filteredCategories.slice(0, limit);
    const hasMore = filteredCategories.length > limit;

    return (
      <div className="px-4 mb-8 mt-4">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-x-2 gap-y-4">
          {items.map((cat) => (
            <div 
              key={cat.id} 
              onClick={() => router.push(`/category/${cat.id}`)}
              className="flex flex-col items-center cursor-pointer group"
            >
              <div className="w-full aspect-square rounded-full bg-transparent flex items-center justify-center p-2 mb-1.5 overflow-hidden transition-all group-hover:scale-105 group-active:scale-95">
                 <img 
                   src={cat.img} 
                   alt={cat.label} 
                   className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" 
                 />
              </div>
              <span className="text-[10px] font-bold text-zinc-800 text-center leading-[1.2] tracking-tight px-0.5 line-clamp-2 w-full">
                {cat.label}
              </span>
            </div>
          ))}
        </div>
        
        {/* Render sections anchored to any of these categories or their subcategories */}
        {items.map(cat => (
          <React.Fragment key={`anchored-${cat.id}`}>
            {renderPromoSections("MIDDLE", cat.id)}
            {cat.subcategories?.map((sub: any) => {
              const subId = typeof sub === 'string' ? sub : (sub.id || sub.label);
              return <React.Fragment key={`anchored-sub-${subId}`}>{renderPromoSections("MIDDLE", subId)}</React.Fragment>;
            })}
          </React.Fragment>
        ))}

        {isMax4Row && hasMore && (
          <div className="mt-6">
            <button 
              onClick={() => router.push(`/category`)}
              className={`w-full py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] uppercase transition-all active:scale-[0.97] border shadow-sm flex items-center justify-center gap-2 ${
                activeSection === 'CAFE' 
                  ? 'bg-[#FAF7F2] border-[#EAD8C0] text-[#8B5E3C] hover:bg-[#EAD8C0]/20' 
                  : activeSection === 'MALL'
                  ? 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100'
                  : 'bg-zinc-50 border-zinc-100 text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              View All Categories
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    );
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
      <div className={`fixed top-0 left-0 w-full flex flex-col z-[60] transition-colors duration-500 ${activeSection === 'CAFE' ? 'bg-[#2D1B14] text-[#EAD8C0]' : activeSection === 'MALL' ? 'bg-black text-white' : 'bg-black text-white'}`}>
        <div className="pt-safe" />
        <div className="h-8 flex items-center overflow-hidden">
          <div className="flex whitespace-nowrap animate-marquee">
            <span className="text-[10px] font-bold tracking-widest px-4">{(settings?.sectionSettings?.[activeSection]?.announcement || settings?.announcement) || "⚡️ Instant Delivery Available • Curated Premium Selections ⚡️"}</span>
            <span className="text-[10px] font-bold tracking-widest px-4">{(settings?.sectionSettings?.[activeSection]?.announcement || settings?.announcement) || "⚡️ Instant Delivery Available • Curated Premium Selections ⚡️"}</span>
          </div>
        </div>
      </div>

      <header className={`fixed top-[calc(theme(spacing.8)+max(env(safe-area-inset-top),2rem))] w-full z-50 transition-all duration-700 ${activeSection === 'CAFE' ? 'bg-[#FAF7F2]/90' : activeSection === 'MALL' ? 'bg-indigo-50/90' : 'bg-white/90'} backdrop-blur-xl border-b ${activeSection === 'CAFE' ? 'border-[#EAD8C0]/20' : activeSection === 'MALL' ? 'border-indigo-100' : 'border-zinc-100'}`}>
        <div className="px-4 py-3">
          {/* Top Row: Address and Account */}
          <div className="flex items-center justify-between w-full mb-4">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setIsAddressModalOpen(true)}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${activeSection === 'CAFE' ? 'bg-[#8B5E3C]/10 text-[#8B5E3C]' : activeSection === 'MALL' ? 'bg-indigo-600/10 text-indigo-600' : 'bg-primary/10 text-primary'}`}>
                <span className="material-symbols-outlined text-[16px] font-bold">location_on</span>
              </div>
              <div className="flex flex-col">
                <span className={`text-[8px] font-black tracking-[0.2em] uppercase transition-colors ${activeSection === 'CAFE' ? 'text-[#8B5E3C]/60' : activeSection === 'MALL' ? 'text-indigo-600/60' : 'text-zinc-400'}`}>Delivery to</span>
                <div className="flex items-center gap-0.5">
                  <span className={`text-[11px] font-bold tracking-tight transition-colors line-clamp-1 max-w-[180px] ${activeSection === 'CAFE' ? 'text-[#2D1B14]' : activeSection === 'MALL' ? 'text-zinc-900' : 'text-zinc-900'}`}>
                    {displayAddress}
                  </span>
                  <span className={`material-symbols-outlined text-[16px] transition-colors ${activeSection === 'CAFE' ? 'text-[#8B5E3C]' : activeSection === 'MALL' ? 'text-indigo-600' : 'text-zinc-400'}`}>expand_more</span>
                </div>
              </div>
            </div>
            <Link href={user ? "/profile" : "/login"} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${activeSection === 'CAFE' ? 'bg-[#EAD8C0]/30 text-[#2D1B14]' : activeSection === 'MALL' ? 'bg-white border border-zinc-100 text-zinc-900' : 'bg-zinc-100 text-zinc-900'} hover:scale-105 active:scale-95`}>
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL'1" }}>{user ? 'account_circle' : 'login'}</span>
            </Link>
          </div>

          {/* New Premium Segmented Tabs */}
          {availableSections.length > 1 && (
            <div className={`relative p-1 rounded-2xl flex items-center transition-all duration-500 mb-4 ${activeSection === 'CAFE' ? 'bg-[#EAD8C0]/20' : activeSection === 'MALL' ? 'bg-indigo-100/50' : 'bg-zinc-100'}`}>
              <div 
                className="absolute top-1 bottom-1 rounded-xl transition-all duration-500 ease-out shadow-sm"
                style={{
                  width: `calc(${100 / availableSections.length}% - 4px)`,
                  left: `calc(${(availableSections.findIndex(s => s.id === activeSection) * (100 / availableSections.length))}% + 2px)`,
                  backgroundColor: activeSection === 'CAFE' ? '#FAF7F2' : 'white'
                }}
              />
              {availableSections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`relative z-10 flex-1 py-2.5 text-[10px] font-black tracking-tighter transition-colors duration-500 flex items-center justify-center ${activeSection === section.id ? (section.id === 'CAFE' ? 'text-[#2D1B14]' : 'text-zinc-900') : 'text-zinc-400'}`}
                >
                  {section.id === 'BB' ? (
                    <><span className={activeSection === 'BB' ? 'text-primary' : ''}>BAZAAR</span>&nbsp;BOLT</>
                  ) : (
                    <>BB&nbsp;<span className={activeSection === section.id ? section.colorClass : ''}>{section.sub}</span></>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Search Bar area */}
          <div onClick={() => router.push(`/search?section=${activeSection}`)} className={`rounded-xl flex items-center px-4 py-3 gap-3 cursor-pointer shadow-sm border transition-all ${activeSection === 'CAFE' ? 'bg-white/50 border-[#EAD8C0]/30' : activeSection === 'MALL' ? 'bg-white/80 border-indigo-100' : 'bg-zinc-50 border-zinc-100'}`}>
            <span className={`material-symbols-outlined text-[18px] font-bold ${activeSection === 'CAFE' ? 'text-[#8B5E3C]' : activeSection === 'MALL' ? 'text-indigo-500' : 'text-zinc-400'}`}>search</span>
            <span className={`text-[12px] font-bold tracking-tight ${activeSection === 'CAFE' ? 'text-[#8B5E3C]/60' : activeSection === 'MALL' ? 'text-zinc-900/60' : 'text-zinc-400'}`}>Search "{activeSection === "CAFE" ? "Cold Brew" : activeSection === "MALL" ? "Fashion & Trends" : "Grocery & More"}"</span>
          </div>
        </div>
      </header>

      <main className={`pt-[calc(230px+env(safe-area-inset-top,0px))] pb-16 overflow-x-hidden min-h-[100dvh] transition-colors duration-700 ${activeSection === 'CAFE' ? 'bg-[#FAF7F2]' : 'bg-white'}`}>
        <div className={`transition-all duration-500 ease-in-out ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
        {(settings?.sectionSettings?.[activeSection]?.storeOpen ?? settings?.storeOpen) === false ? (
          <section className="px-6 py-20 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-700">
            <h2 className="text-5xl font-headline font-black text-zinc-900 tracking-tighter leading-[0.8] mb-8">Currently <br /><span className={`${activeSection === 'CAFE' ? 'text-[#8B5E3C]' : activeSection === 'MALL' ? 'text-indigo-500' : 'text-primary'}`}>Unavailable</span></h2>
            <p className="max-w-xs mx-auto text-[10px] font-bold text-zinc-400 tracking-[0.2em] leading-relaxed mb-12">We're Not Serving This Area At The Moment.</p>
          </section>
        ) : (
          <>
            {/* Falling back to default category grid if no custom category_grid is defined for this section */}
            {(!settings?.promoSections || !settings.promoSections.some(s => s.section === activeSection && s.type === "category_grid")) && (
              renderCategorySections()
            )}

            {/* Dynamic Promo Sections - VERY TOP */}
            {renderPromoSections("TOP")}

            <section className="px-4 mb-8">
              <div className={`relative w-full aspect-[4/3] sm:aspect-[21/9] rounded-[40px] overflow-hidden shadow-2xl transition-all duration-500 ${activeSection === 'CAFE' ? 'bg-[#EAD8C0]/20' : 'bg-zinc-100'}`}>
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



            <footer className="mt-20 px-8 pb-32 flex flex-col items-start text-left max-w-2xl mx-auto w-full">
              <h2 className="font-headline font-black text-[42px] sm:text-[56px] text-zinc-400/80 tracking-tighter leading-[0.9] mb-8">
                From<br />
                Thought<br />
                to doorstep.
              </h2>
              <div className="w-full h-[1.5px] bg-zinc-100 mb-8" />
              <div className="flex items-center gap-1.5 opacity-40">
                <span className="font-headline font-black text-xl text-zinc-900 tracking-tighter">bazaarbolt</span>
                <span className="text-red-500 text-lg">❤️</span>
              </div>
            </footer>
          </>
        )}
        </div>
      </main>

      <ProductBottomSheet 
        isOpen={isProductSheetOpen} 
        onClose={() => setIsProductSheetOpen(false)} 
        productId={selectedProductId || ""} 
        products={sheetProductsContext || filteredProducts} 
      />

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
