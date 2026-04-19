"use client";

import { useEffect, useState, useRef } from "react";
import { useStore } from "@/store/useStore";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, Address } from "@/types";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

export default function Home() {
  const { settings, initSettings, settingsLoading, cart, addToCart, updateQuantity, selectedAddress, setSelectedAddress } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState<Address>({
    line1: "",
    line2: "",
    city: "",
    pincode: "",
    landmark: ""
  });

  useEffect(() => {
    if (!authLoading && user) {
      if (role === 'admin') router.replace("/admin");
      else if (role === 'rider') router.replace("/rider");
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    const unsubSettings = initSettings();

    // Fetch Dynamic Categories
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

  if (!authLoading && user && role !== 'customer') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  const handleSaveAddress = () => {
    if (!addressForm.line1 || !addressForm.city || !addressForm.pincode) {
      toast.error("Please fill required fields");
      return;
    }
    setSelectedAddress(addressForm);
    setIsAddressModalOpen(false);
    toast.success("Delivery address updated!");
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProductsByCategory = (cat: string) => products.filter(p => p.category === cat);

  const displayAddress = selectedAddress
    ? `${selectedAddress.line1}, ${selectedAddress.city}`
    : "Set Delivery Address";

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
                className="bg-white border-[1.5px] border-green-600 text-green-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-lg active:scale-90 transition-all"
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
            <span className="bg-zinc-100 text-zinc-500 text-[7px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">1 pc</span>
            {product.stock < 10 && <span className="bg-orange-50 text-orange-600 text-[7px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Only {product.stock} left</span>}
          </div>
          <Link href={`/product/${product.id}`} className="text-[10px] font-bold text-zinc-900 leading-[1.2] mb-1.5 line-clamp-2 hover:text-green-700" title={product.name}>
            {product.name}
          </Link>
          <div className="flex items-center flex-wrap gap-x-1.5">
            <span className="text-xs font-black text-zinc-900">₹{product.price.toFixed(0)}</span>
            <span className="text-[9px] text-zinc-400 line-through font-medium">₹{(product.price * 1.25).toFixed(0)}</span>
          </div>
        </div>
      </div>
    );
  };

  if (settingsLoading) {
    return (
      <div className="min-h-[100dvh] bg-surface flex items-center justify-center space-x-2">
        <div className="w-4 h-4 bg-primary rounded-full animate-bounce"></div>
      </div>
    );
  }

  // Store Closed / Unserviceable State
  return (
    <div className="bg-white min-h-screen relative overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-8 bg-black text-white flex items-center overflow-hidden z-[60]">
        <div className="flex whitespace-nowrap animate-marquee">
          <span className="text-[10px] font-black uppercase tracking-widest px-4">{settings?.announcement || "⚡️ Free delivery above ₹99 • Reliable Slot Delivery ⚡️"}</span>
          <span className="text-[10px] font-black uppercase tracking-widest px-4">{settings?.announcement || "⚡️ Free delivery above ₹99 • Reliable Slot Delivery ⚡️"}</span>
        </div>
      </div>

      <header className={`fixed top-8 w-full z-50 bg-white shadow-sm flex flex-col pt-3 border-b border-zinc-100 transition-all pb-4`}>
        <div className="flex items-center justify-between px-4 w-full mb-3">
          <div className="flex flex-col cursor-pointer group" onClick={() => setIsAddressModalOpen(true)}>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black uppercase text-primary tracking-wider font-headline">Delivery To</span>
              <span className="material-symbols-outlined text-zinc-900 text-[14px] font-bold">expand_more</span>
            </div>
            <span className="text-xs font-extrabold font-headline tracking-tight text-zinc-900 truncate max-w-[220px]">{displayAddress}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href={user ? "/profile" : "/login"} className="p-1 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-zinc-900 text-xl align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>{user ? 'account_circle' : 'login'}</span>
            </Link>
          </div>
        </div>
        <div className="px-4">
          <div className="bg-zinc-100 rounded-2xl flex items-center px-4 py-3 gap-3 border border-zinc-200 focus-within:border-primary focus-within:bg-white transition-all shadow-inner">
            <span className="material-symbols-outlined text-zinc-400 text-lg">search</span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search 'milk'"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-xs font-black uppercase tracking-widest placeholder:text-zinc-400"
            />
          </div>
        </div>
      </header>

      <main className="pt-[140px] pb-32 overflow-x-hidden min-h-[100dvh] bg-white">
        {!settings?.storeOpen ? (
          <section className="px-6 py-20 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-700">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full scale-150"></div>
              <span className="material-symbols-outlined text-[120px] text-zinc-900 relative z-10 opacity-[0.03]" style={{ fontVariationSettings: "'FILL' 1" }}>nights_stay</span>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
                <span className="material-symbols-outlined text-zinc-900 text-7xl opacity-10">door_back</span>
              </div>
            </div>

            <h2 className="text-5xl md:text-7xl font-headline font-black text-zinc-900 tracking-tighter uppercase leading-[0.8] mb-8">
              Currently <br />
              <span className="text-primary drop-shadow-[0_0_30px_rgba(34,197,94,0.3)]">Unavailable</span>
            </h2>

            <p className="max-w-xs mx-auto text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] leading-relaxed mb-12">
              It's not you, it's us. We're not serving this area at the moment. Sorry for the inconvenience 😔
            </p>

            <div className="w-full max-w-[320px] space-y-3">
              {[
                { icon: 'help_center', label: 'Previous Orders help', href: '/orders' },
                { icon: 'info', label: 'About BazaarBolt', href: '/help' },
              ].map((item, idx) => (
                <Link key={idx} href={item.href} className="flex items-center justify-between group p-5 bg-zinc-50 border border-zinc-100 rounded-3xl hover:border-primary transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center border border-zinc-100">
                      <span className="material-symbols-outlined text-zinc-400 text-xl group-hover:text-zinc-900 transition-colors">{item.icon}</span>
                    </div>
                    <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">{item.label}</span>
                  </div>
                  <span className="material-symbols-outlined text-zinc-300 text-sm group-hover:translate-x-1 transition-transform">chevron_right</span>
                </Link>
              ))}
            </div>
          </section>
        ) : searchTerm ? (
          <section className="px-4 mt-6">
            <h3 className="font-headline font-black text-lg text-zinc-900 mb-4 tracking-tighter uppercase">RESULTS FOR "{searchTerm}"</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        ) : (
          <>
            <section className="mt-8 mb-8">
              <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4">
                {categories.map(cat => (
                  <div key={cat.id} onClick={() => router.push(`/category/${cat.id}`)} className="flex flex-col items-center min-w-[64px] gap-2 cursor-pointer group">
                    <div className="w-14 h-14 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center p-0 overflow-hidden group-hover:border-primary transition-all shadow-sm">
                      <img className="w-full h-full object-cover" src={cat.img} alt={cat.label} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-tighter text-center text-zinc-500 group-hover:text-zinc-900">{cat.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="px-4 mb-8">
              <div className="relative w-full aspect-[21/9] rounded-3xl overflow-hidden shadow-xl bg-zinc-100">
                <img className="w-full h-full object-cover" src={settings?.bannerImage || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1074"} alt="Banner" />
              </div>
            </section>

            {[
              { title: "Bestsellers", icon: "local_fire_department", iconColor: "text-orange-500", products: products.slice(0, 4) },
              { title: "Pure Dairy", icon: "water_drop", iconColor: "text-blue-500", products: products.filter(p => p.category === "Dairy").slice(0, 4) },
              { title: "Fresh Veggies", icon: "eco", iconColor: "text-green-500", products: products.filter(p => p.category === "Vegetables").slice(0, 4) },
              { title: "Snack Station", icon: "fastfood", iconColor: "text-amber-500", products: products.filter(p => p.category === "Munchies").slice(0, 4) },
              { title: "Beverages", icon: "wine_bar", iconColor: "text-cyan-500", products: products.filter(p => p.category === "Beverages").slice(0, 4) }
            ].map((section, idx) => section.products.length > 0 && (
              <section key={idx} className="mb-10 px-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-headline font-black text-lg tracking-tight text-zinc-900 flex items-center gap-2 uppercase">
                    <span className={`material-symbols-outlined ${section.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{section.icon}</span>
                    {section.title}
                  </h3>
                  <Link
                    href={`/category/${section.title === "Bestsellers" ? "Vegetables" :
                      section.title === "Fresh Veggies" ? "Vegetables" :
                        section.title === "Snack Station" ? "Munchies" :
                          section.title === "Pure Dairy" ? "Dairy" :
                            "Beverages"
                      }`}
                    className="text-[10px] font-black uppercase text-primary tracking-widest underline underline-offset-4"
                  >
                    See All
                  </Link>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">{section.products.map(p => <ProductCard key={p.id} product={p} />)}</div>
              </section>
            ))}

            <section className="px-4 mb-16">
               <div className="bg-zinc-900 rounded-[40px] p-8 relative overflow-hidden flex flex-col items-center text-center">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-zinc-600/20 rounded-bl-full pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-tr-full pointer-events-none" />
                  
                  <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">Partner Spotlight</span>
                  <h4 className="text-3xl font-headline font-black text-white tracking-tighter uppercase leading-none mb-4">
                    freshNESS <br />
                    DELIVERED <span className="text-primary">faster</span>
                  </h4>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest max-w-[200px] leading-relaxed mb-6">
                    Join 10k+ households getting their daily essentials within minutes.
                  </p>
                  <button className="bg-white text-zinc-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Explore Deals</button>
               </div>
            </section>

            <footer className="mt-24 px-6 pb-32 text-center">
              <h2 className="font-headline font-black text-3xl text-zinc-900 tracking-tighter uppercase mb-4 opacity-60">
                comfort in every cart
              </h2>

              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="h-[1px] w-12 bg-zinc-200 opacity-40" />

                <p className="font-black text-zinc-900 uppercase tracking-[0.4em] opacity-30">
                  BAZAARBOLT
                </p>

                <div className="h-[1px] w-12 bg-zinc-200 opacity-40" />
              </div>
            </footer>
          </>
        )}
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] z-50 bg-white/95 backdrop-blur-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] border border-white/40 rounded-full px-6 py-2.5 flex justify-between items-center transition-all">
        <button onClick={() => { setSearchTerm(""); window.scrollTo({ top: 0, behavior: "smooth" }) }} className="flex flex-col items-center justify-center text-zinc-900 group active:scale-95 transition-transform">
          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          <span className="font-headline text-[8px] font-black uppercase tracking-widest mt-0.5 text-zinc-900">Home</span>
        </button>

        <button onClick={() => { setSearchTerm(" "); setTimeout(() => searchInputRef.current?.focus(), 50) }} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-all">
          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">search</span>
          <span className="font-headline text-[8px] font-black uppercase tracking-widest mt-0.5 text-zinc-400 group-hover:text-zinc-900">Search</span>
        </button>

        <button onClick={() => router.push("/orders")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-all">
          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">history</span>
          <span className="font-headline text-[8px] font-black uppercase tracking-widest mt-0.5 text-zinc-400 group-hover:text-zinc-900">Orders</span>
        </button>

        <button onClick={() => router.push("/cart")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-transform relative">
          <div className="relative">
            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">shopping_bag</span>
            {cartCount > 0 && (
              <div className="absolute -top-1.5 -right-2 bg-primary text-zinc-900 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center pointer-events-none shadow-sm shadow-primary/40 border-white">
                {cartCount}
              </div>
            )}
          </div>
          <span className="font-headline text-[8px] font-black uppercase tracking-widest mt-0.5 text-zinc-400 group-hover:text-zinc-900">Cart</span>
        </button>
      </nav>

      {/* Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-[100] bg-zinc-950/40 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-full duration-500 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-10 opacity-5 -z-10">
              <span className="material-symbols-outlined text-[140px]">location_on</span>
            </div>

            <div className="flex justify-between items-start mb-10">
              <div>
                <h2 className="text-4xl font-headline font-black text-zinc-900 tracking-tighter uppercase leading-none">Set Address</h2>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-2">Where should we bolt your order?</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1 block">Building / Street / House No.</label>
                  <input
                    type="text"
                    placeholder="Flat No, House name, Street"
                    className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-4 ring-primary/20 transition-all"
                    value={addressForm.line1}
                    onChange={e => setAddressForm({ ...addressForm, line1: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1 block">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Noida"
                      className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-4 ring-primary/20 transition-all"
                      value={addressForm.city}
                      onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1 block">Pincode</label>
                    <input
                      type="number"
                      placeholder="110001"
                      className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-4 ring-primary/20 transition-all"
                      value={addressForm.pincode}
                      onChange={e => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1 block">Landmark (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Near Apollo Hospital"
                    className="w-full bg-zinc-50 border-none rounded-2xl p-4 font-bold text-sm focus:ring-4 ring-primary/20 transition-all"
                    value={addressForm.landmark}
                    onChange={e => setAddressForm({ ...addressForm, landmark: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button onClick={() => setIsAddressModalOpen(false)} className="flex-1 bg-zinc-100 text-zinc-500 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-zinc-200">Cancel</button>
                <button onClick={handleSaveAddress} className="flex-1 bg-zinc-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all hover:bg-black shadow-xl shadow-zinc-900/10">Use This Address</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
