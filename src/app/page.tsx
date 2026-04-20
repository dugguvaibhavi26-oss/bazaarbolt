"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { collection, onSnapshot, query, where, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, Address } from "@/types";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { AdUnit } from "@/components/AdUnit";
import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";

export default function Home() {
  const { settings, initSettings, settingsLoading, cart, addToCart, updateQuantity, selectedAddress, setSelectedAddress } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, role, loading: authLoading, userData } = useAuth();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<"BB" | "CAFE">("BB");
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState<Address>({
    line1: "",
    line2: "",
    city: "",
    pincode: "",
    landmark: ""
  });

  // Dynamic Banners from Settings
  const BANNERS = (settings?.heroBanners?.length 
    ? settings.heroBanners 
    : [
        { 
          url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000", 
          title: "FRESH HARVEST", 
          subtitle: "DIRECT FROM FARMS", 
          section: "BB" as const
        },
        { 
          url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=1000", 
          title: "ARTISAN BREWS", 
          subtitle: "FRESHLY ROASTED", 
          section: "CAFE" as const
        }
      ]
  ).filter(b => b.section === activeSection);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      if (role === 'admin') router.replace("/admin");
      else if (role === 'rider') router.replace("/rider");
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    const unsubSettings = initSettings();

    const catQuery = query(collection(db, "categories"), where("active", "==", true));
    const unsubCats = onSnapshot(catQuery, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      setCategories(items);
    });

    const q = query(collection(db, "products"), where("active", "==", true));
    const unsubProducts = onSnapshot(q, (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.isDeleted) prods.push({ id: doc.id, ...data } as Product);
      });
      setProducts(prods);
      setLoading(false);
    });
    return () => { unsubSettings(); unsubProducts(); unsubCats(); };
  }, [initSettings]);

  // Filter content based on active section
  const filteredCategories = categories.filter(cat => {
    return ((cat as any).section || "BB") === activeSection;
  });

  const filteredProducts = products.filter(p => {
    return ((p as any).section || "BB") === activeSection;
  });

  useEffect(() => {
    if (BANNERS.length <= 1) {
      setCurrentBannerIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [BANNERS.length, activeSection]);

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
      <div className={`flex flex-col gap-1.5 transition-all group ${outOfStock ? 'opacity-60 grayscale' : ''}`}>
        <div className="relative aspect-square bg-[#F3F4F6] rounded-2xl overflow-hidden border border-zinc-100 cursor-pointer" onClick={() => router.push(`/product/${product.id}`)}>
          <img className="w-full h-full p-2 object-contain group-hover:scale-105 transition-transform duration-500" src={product.image} alt={product.name} />
          <div className="absolute bottom-1 right-1">
            {!cartItem ? (
              <button
                disabled={outOfStock}
                onClick={(e) => { e.stopPropagation(); addToCart({ ...product, quantity: 1 }); }}
                className="bg-white border-[1.5px] border-green-600 text-green-600 px-3 py-1 rounded-lg text-[10px] font-black shadow-lg active:scale-90 transition-all uppercase"
              >
                ADD
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
            <span className="bg-zinc-100 text-zinc-500 text-[7px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase leading-none">1 UNIT</span>
            {product.stock < 10 && product.stock > 0 && <span className="bg-orange-50 text-orange-600 text-[7px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase leading-none">ONLY {product.stock} LEFT</span>}
          </div>
          <Link href={`/product/${product.id}`} className="text-[10px] font-bold text-zinc-900 leading-[1.2] mb-1.5 line-clamp-2 hover:text-green-700 uppercase tracking-tight" title={product.name}>
            {product.name}
          </Link>
          <div className="flex items-center flex-wrap gap-x-1.5">
            <span className="text-xs font-black text-zinc-900 tracking-tight uppercase">₹{product.price.toFixed(0)}</span>
            <span className="text-[9px] text-zinc-400 line-through font-medium tracking-tight opacity-50 uppercase">₹{(product.price * 1.25).toFixed(0)}</span>
          </div>
        </div>
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
    <div className="bg-white min-h-screen relative overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-8 bg-black text-white flex items-center overflow-hidden z-[60]">
        <div className="flex whitespace-nowrap animate-marquee">
          <span className="text-[10px] font-bold tracking-widest px-4 uppercase">{settings?.announcement || "⚡️ INSTANT DELIVERY AVAILABLE • CURATED PREMIUM SELECTIONS ⚡️"}</span>
          <span className="text-[10px] font-bold tracking-widest px-4 uppercase">{settings?.announcement || "⚡️ INSTANT DELIVERY AVAILABLE • CURATED PREMIUM SELECTIONS ⚡️"}</span>
        </div>
      </div>

      <header className={`fixed top-8 w-full z-50 transition-all shadow-sm`}>
        {/* Top area with neutral background */}
        <div className="bg-zinc-100 pt-4 px-4 flex flex-col">
          {/* Top Row: Address and Account */}
          <div className="flex items-center justify-between w-full mb-5">
            <div className="flex flex-col cursor-pointer group" onClick={() => setIsAddressModalOpen(true)}>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black text-zinc-900 tracking-wider font-headline uppercase">Delivery in 10 minutes</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-extrabold font-headline tracking-tight text-zinc-900 truncate max-w-[220px] uppercase">{displayAddress}</span>
                <span className="material-symbols-outlined text-zinc-900 text-[14px] font-bold">expand_more</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href={user ? "/profile" : "/login"} className="p-1.5 bg-black/5 rounded-full hover:bg-black/10 transition-colors">
                <span className="material-symbols-outlined text-zinc-900 text-xl align-middle" style={{ fontVariationSettings: "'FILL'1" }}>{user ? 'account_circle' : 'login'}</span>
              </Link>
            </div>
          </div>

          {/* Section Tabs (Bazaarbolt Style) */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar items-end">
            <button 
              onClick={() => setActiveSection("BB")}
              className={`flex-shrink-0 px-6 py-3 text-[16px] font-black tracking-tighter transition-all flex items-center justify-center min-w-[100px] lowercase ${activeSection === "BB" ? "bg-white rounded-t-2xl" : "bg-transparent opacity-50 hover:opacity-100"}`}
            >
              <span className="text-primary">bazaar</span><span className="text-zinc-900">bolt</span>
            </button>
            <button 
              onClick={() => setActiveSection("CAFE")}
              className={`flex-shrink-0 px-6 py-3 text-[16px] font-black tracking-tighter transition-all flex items-center justify-center min-w-[100px] lowercase ${activeSection === "CAFE" ? "bg-white rounded-t-2xl" : "bg-transparent opacity-50 hover:opacity-100"}`}
            >
              <span className="text-primary">bb&nbsp;</span><span className="text-zinc-900">cafe</span>
            </button>
          </div>
        </div>

        {/* Search Bar area with exact same bg as active tab to seamlessly connect */}
        <div className="bg-white px-4 py-3 border-b border-zinc-100">
          <div onClick={() => router.push('/search')} className="bg-white border border-zinc-200 rounded-[12px] flex items-center px-4 py-3.5 gap-3 cursor-pointer shadow-sm">
            <span className="material-symbols-outlined text-zinc-400 text-xl font-bold">search</span>
            <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">SEARCH FOR "{activeSection === "CAFE" ? "ESPRESSO" : "SAFAI ABHIYAAN"}"</span>
          </div>
        </div>
      </header>

      <main className="pt-[220px] pb-32 overflow-x-hidden min-h-[100dvh] bg-white">
        {!settings?.storeOpen ? (
          <section className="px-6 py-20 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-700">
            <h2 className="text-5xl font-headline font-black text-zinc-900 tracking-tighter leading-[0.8] mb-8 uppercase">CURRENTLY <br /><span className="text-primary uppercase">UNAVAILABLE</span></h2>
            <p className="max-w-xs mx-auto text-[10px] font-bold text-zinc-400 tracking-[0.2em] leading-relaxed mb-12 uppercase">WE'RE NOT SERVING THIS AREA AT THE MOMENT.</p>
          </section>
        ) : (
          <>
            <section className="mt-4 mb-10 overflow-hidden">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-x-2 gap-y-5 px-4 justify-items-center">
                {filteredCategories.map(cat => (
                  <div key={cat.id} onClick={() => router.push(`/category/${cat.id}`)} className="flex flex-col items-center gap-2 cursor-pointer group w-full max-w-[80px]">
                    <div className="w-[68px] h-[68px] rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center p-0 overflow-hidden flex-shrink-0 group-hover:border-primary transition-all shadow-sm">
                      <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src={cat.img} alt={cat.label} />
                    </div>
                    <span className="text-[10px] font-medium tracking-tight text-center text-zinc-800 group-hover:text-primary leading-[1.1] w-full break-words">{cat.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="px-4 mb-8">
              <div className="relative w-full aspect-[21/9] rounded-[32px] overflow-hidden shadow-xl bg-zinc-100 group">
                {BANNERS.map((banner, idx) => (
                  <div 
                    key={idx}
                    className={`absolute inset-0 transition-all duration-1000 ${idx === currentBannerIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}
                  >
                    <img className="w-full h-full object-cover" src={banner.url} alt={banner.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6 uppercase">
                      <p className="text-[10px] font-black tracking-widest text-white/70 mb-1">{banner.subtitle}</p>
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

            {[
              { title: "BESTSELLERS", icon: "local_fire_department", iconColor: "text-orange-500", products: filteredProducts.slice(0, 12), link: "/search" },
              {
                title: "NEW ARRIVALS",
                icon: "new_releases",
                iconColor: "text-blue-600",
                products: [...filteredProducts].sort(() => 0).slice(0, 12),
                link: "/search"
              },
              ...filteredCategories.map(cat => ({
                title: cat.label,
                icon: "category",
                iconColor: "text-zinc-400",
                products: filteredProducts.filter(p => p.category === cat.id || p.category === cat.label).slice(0, 12),
                link: `/category/${cat.id}`
              }))
            ].map((section, idx) => section.products.length > 0 && (
              <section key={idx} className="mb-10 px-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-headline font-black text-lg tracking-tight text-zinc-900 flex items-center gap-2 uppercase">
                    <span className={`material-symbols-outlined ${section.iconColor}`} style={{ fontVariationSettings: "'FILL'1" }}>{section.icon}</span>
                    <span className="uppercase">{section.title}</span>
                  </h3>
                  <Link href={section.link} className="text-[10px] font-black text-primary tracking-widest underline underline-offset-4 uppercase">SEE ALL</Link>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">{section.products.map(p => <ProductCard key={p.id} product={p} />)}</div>
              </section>
            ))}

            <section className="px-4 mb-16">
              <AdUnit slotId="home-mid-banner" className="m-0" />
            </section>

            <footer className="mt-24 px-6 pb-32 text-center">
              <h2 className="font-headline font-black text-2xl text-zinc-900 tracking-tighter mb-4 opacity-40 italic-remove uppercase">COMFORT IN EVERY CART</h2>
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
        <div className="fixed inset-0 z-[100] bg-zinc-950/40 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-10 opacity-5 -z-10"><span className="material-symbols-outlined text-[140px]">location_on</span></div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-4xl font-headline font-black text-zinc-900 tracking-tighter leading-none uppercase">Select Address</h2>
                <p className="text-[10px] font-bold text-zinc-400 tracking-widest mt-2 uppercase">Where should we bolt your order?</p>
              </div>
            </div>

            <div className="space-y-6">
              {userData?.addresses?.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[9px] font-black tracking-widest text-zinc-400 ml-1 block uppercase">Saved Addresses</label>
                  <div className="grid grid-cols-1 gap-2">
                    {userData.addresses.map((addr: Address, idx: number) => (
                      <button 
                        key={idx}
                        onClick={() => { setSelectedAddress(addr); setIsAddressModalOpen(false); }}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 ${selectedAddress?.line1 === addr.line1 ? 'bg-primary/5 border-primary shadow-sm' : 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'}`}
                      >
                         <span className="material-symbols-outlined text-zinc-400">home</span>
                         <div className="flex flex-col">
                           <span className="text-[10px] font-black text-zinc-900 uppercase">{addr.city}</span>
                           <span className="text-[9px] font-bold text-zinc-400 truncate max-w-[200px] uppercase">{addr.line1}</span>
                         </div>
                         {selectedAddress?.line1 === addr.line1 && <span className="material-symbols-outlined ml-auto text-primary text-sm">check_circle</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-zinc-100">
                <button onClick={() => { setAddressForm({line1:"", line2:"", city:"", pincode:"", landmark:""}); /* logic to show form below */ }} className="flex items-center gap-2 text-primary font-black text-[10px] tracking-widest uppercase mb-4">
                  <span className="material-symbols-outlined text-lg">add_circle</span>
                  Add a New Address
                </button>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black tracking-widest text-zinc-400 ml-1 block uppercase">Building / house no.</label>
                    <input type="text" placeholder="Flat no, house name, street" className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-4 ring-primary/20 transition-all uppercase placeholder:uppercase" value={addressForm.line1} onChange={e => setAddressForm({ ...addressForm, line1: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black tracking-widest text-zinc-400 ml-1 block uppercase">City</label>
                      <input type="text" placeholder="e.g. Noida" className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-4 ring-primary/20 transition-all uppercase placeholder:uppercase" value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black tracking-widest text-zinc-400 ml-1 block uppercase">Pincode</label>
                      <input type="number" placeholder="110001" className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-4 ring-primary/20 transition-all" value={addressForm.pincode} onChange={e => setAddressForm({ ...addressForm, pincode: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 pt-6">
                  <button onClick={() => setIsAddressModalOpen(false)} className="flex-1 bg-zinc-100 text-zinc-500 py-5 rounded-3xl font-black tracking-widest text-[10px] transition-all hover:bg-zinc-200 uppercase">Cancel</button>
                  <button onClick={handleSaveAddress} className="flex-1 bg-zinc-900 text-white py-5 rounded-3xl font-black tracking-widest text-[10px] transition-all hover:bg-black shadow-xl shadow-zinc-900/10 uppercase">Save & Use</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
