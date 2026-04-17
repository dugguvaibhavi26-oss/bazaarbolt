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

const CATEGORIES = [
  { id: "Vegetables", name: "Vegetables", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA1pm_sqQ0qiiz-0usKkww7tzfuE_2w5YQ4xrZDn05NXFNpBAnOmHJx-ZRNWXz8g6IS0bIzUgc6x1lv_4MpxJv5JEeUPUAGpZPcVObQcN2L-5j1Cn7YHj3qhb-7rWampdIBsvVhEtcHKYJK1BTuSbQQDMV6PyHqc0XbrUqi8vgTiE9AhWz-vnz0o8aJvcC_S0AiGuyJF3oE6qO6HXiFEPAedxQ1BDhQ_IGyI8i99gXP-ZPxIx-fzJiZXooV_TA3Di2WOWPkmOBNwu3l", label: "Vegetables" },
  { id: "Dairy", name: "Dairy", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA4HUAio5IxKiRkz2BPFOdq5RSda7eP-Up4srmVnb6-yzKn1_TxLNNpZFLvMIpr3F0Y53wDiVwEFCFpfv_xFh5JCHBXnBOcd-T3IwzD7tKQQTwGjnOXCW4eSr2Yj8w3xccNgMXef47LAGvh6tKKGHvBjhe0ua8Nj1IZh6RVmyIW5XpSuwOrM2JBuOQcQbeS7-rbVZ4YGmZRrVlkfbrKQvlGedCm-x6MixxoMpkOGY1Jk_wfHX14uuxJZX-cYdSdYJtTbzqrnGuhKHjL", label: "Dairy & Eggs" },
  { id: "Munchies", name: "Munchies", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAEuxZomF5R1zlep_9fSSha0FOwl6UhU8XWOxlvg6p0w0xwsW3UXaRW24uDvjiW09bu_I-wyNMcCrjcLvg_347YBerqqSjHtlJ4O6IHlnbzewJY9UY2z_wM4VlJDQyuP6jK-fmnRTh7cBsfz8l9pGIc-rkCKDmgIhMTnigc-UQbbqqAT7ropeW0NOJZc9EKoMda3PqLyF7ux50ofRHNeQbCKTsotARx-RzQeq2BLPzglYUc_aLd_TKZtm7XMA3vWuLwz5ccubXV_O7b", label: "Munchies" },
  { id: "Beverages", name: "Beverages", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuACno2RBAW4V2OXESXUoPYdI8X_6Pocrfk2UNba5-X-bxLW20TumbjJBBM_H6WwnIjKo8C-DEyWRGlfmC5itzrvAg7b7qfEn6wnJjK9Lm3f_CWANjRqrBRcH6Tgl5viyFcIE0USY9H1Nd0BP3oyTOpy8ofAIELTxAZOj9JjcNIT5mzTVMmwQYwWv1l7Pcd0QIloPRc4kk0iEEOs4lPAK_pY1mapp13ObXv2rhJ9cbbzdQ5OWdZRUWbyqR5zJLLDKrol1B-Na6yQ6_s7", label: "Drinks" }
];

export default function Home() {
  const { settings, initSettings, settingsLoading, cart, addToCart, updateQuantity, selectedAddress, setSelectedAddress } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
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
    return () => { unsubSettings(); unsubProducts(); };
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

  return (
    <>
      <div className="fixed top-0 left-0 w-full h-8 bg-black text-white flex items-center overflow-hidden z-[60]">
        <div className="flex whitespace-nowrap animate-marquee">
          <span className="text-[10px] font-black uppercase tracking-widest px-4">{settings?.announcement || "⚡️ 10 Minute Delivery Guaranteed • Huge Savings on Vegetables • Welcome to BazaarBolt ⚡️"}</span>
          <span className="text-[10px] font-black uppercase tracking-widest px-4">{settings?.announcement || "⚡️ 10 Minute Delivery Guaranteed • Huge Savings on Vegetables • Welcome to BazaarBolt ⚡️"}</span>
        </div>
      </div>

      {/* Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsAddressModalOpen(false)} className="absolute top-4 right-4 p-2 bg-zinc-100 rounded-full hover:bg-zinc-200">
              <span className="material-symbols-outlined text-zinc-900 text-sm font-bold">close</span>
            </button>
            <h2 className="text-xl font-black text-zinc-900 mb-6 font-headline uppercase italic tracking-tighter">Delivery Address</h2>
            
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase mb-1 block">Building / Flat / House No *</label>
                  <input 
                    type="text" 
                    value={addressForm.line1}
                    onChange={e => setAddressForm({...addressForm, line1: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900"
                    placeholder="e.g. Flat 402, Royal Residency"
                  />
               </div>
               <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase mb-1 block">Area / Sector / Locality</label>
                  <input 
                    type="text" 
                    value={addressForm.line2}
                    onChange={e => setAddressForm({...addressForm, line2: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900"
                    placeholder="e.g. Sector 45"
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase mb-1 block">City *</label>
                    <input 
                      type="text" 
                      value={addressForm.city}
                      onChange={e => setAddressForm({...addressForm, city: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase mb-1 block">Pincode *</label>
                    <input 
                      type="number" 
                      value={addressForm.pincode}
                      onChange={e => setAddressForm({...addressForm, pincode: e.target.value})}
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900"
                    />
                  </div>
               </div>
               <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase mb-1 block">Nearby Landmark</label>
                  <input 
                    type="text" 
                    value={addressForm.landmark}
                    onChange={e => setAddressForm({...addressForm, landmark: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900"
                    placeholder="e.g. Opp. Apollo Hospital"
                  />
               </div>
               <button onClick={handleSaveAddress} className="w-full py-4 bg-zinc-900 text-white text-xs font-black uppercase rounded-2xl tracking-widest shadow-xl active:scale-95 transition-all mt-4">Save & Use</button>
            </div>
          </div>
        </div>
      )}

      {/* TopAppBar */}
      <header className="fixed top-8 w-full z-50 bg-white shadow-sm flex flex-col pt-3 pb-3 border-b border-zinc-100">
        <div className="flex items-center justify-between px-4 w-full">
          <div className="flex flex-col cursor-pointer group" onClick={() => setIsAddressModalOpen(true)}>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black uppercase text-zinc-900 tracking-wider">Delivery To</span>
              <span className="material-symbols-outlined text-primary text-[14px] font-bold">expand_more</span>
            </div>
            <span className="text-[13px] font-extrabold font-headline tracking-tight text-zinc-500 truncate max-w-[180px]">{displayAddress}</span>
          </div>
          <Link href={user ? "/profile" : "/login"} className="p-1.5 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors block">
            <span className="material-symbols-outlined text-zinc-900 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{user ? 'account_circle' : 'login'}</span>
          </Link>
        </div>
        <div className="px-4 mt-3">
          <div className="flex items-center gap-2 bg-zinc-100 px-3 py-2.5 rounded-xl border border-transparent focus-within:bg-white focus-within:border-primary/50 transition-all">
            <span className="material-symbols-outlined text-zinc-400 text-xl">search</span>
            <input ref={searchInputRef} className="bg-transparent border-none outline-none focus:ring-0 w-full text-xs font-bold text-zinc-900" placeholder="Search store..." type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </header>

      <main className="pt-[140px] pb-32 overflow-x-hidden min-h-[100dvh] bg-white">
        {searchTerm ? (
          <section className="px-4 mt-6">
            <h3 className="font-headline font-black text-lg text-zinc-900 mb-4 tracking-tighter uppercase italic">RESULTS FOR "{searchTerm}"</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        ) : (
          <>
            <section className="mt-8 mb-8">
              <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4">
                {CATEGORIES.map(cat => (
                  <div key={cat.id} onClick={() => router.push(`/category/${cat.id}`)} className="flex flex-col items-center min-w-[64px] gap-2 cursor-pointer group">
                    <div className="w-14 h-14 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center p-0 overflow-hidden group-hover:border-primary transition-all shadow-sm"><img className="w-full h-full object-cover" src={cat.img} alt={cat.label} /></div>
                    <span className="text-[9px] font-black uppercase tracking-tighter text-center text-zinc-500 group-hover:text-zinc-900">{cat.label}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="px-4 mb-8">
              <div className="relative w-full aspect-[2/1] rounded-3xl overflow-hidden shadow-xl bg-zinc-100">
                <img className="w-full h-full object-cover" src={settings?.bannerImage || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1074"} alt="Banner" />
              </div>
            </section>
            {[
              { title: "Bestsellers", icon: "local_fire_department", iconColor: "text-orange-500", products: products.slice(0, 4) },
              { title: "Pure Dairy", icon: "water_drop", iconColor: "text-blue-500", products: getProductsByCategory("Dairy").slice(0, 4) },
              { title: "Fresh Veggies", icon: "eco", iconColor: "text-green-500", products: getProductsByCategory("Vegetables").slice(0, 4) },
              { title: "Snack Station", icon: "fastfood", iconColor: "text-amber-500", products: getProductsByCategory("Munchies").slice(0, 4) },
              { title: "Beverages", icon: "wine_bar", iconColor: "text-cyan-500", products: getProductsByCategory("Beverages").slice(0, 4) }
            ].map((section, idx) => section.products.length > 0 && (
              <section key={idx} className="mb-10 px-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-headline font-black text-lg tracking-tight text-zinc-900 flex items-center gap-2 uppercase italic">
                    <span className={`material-symbols-outlined ${section.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{section.icon}</span>
                    {section.title}
                  </h3>
                  <Link href={`/category/${section.title === "Bestsellers" ? "Vegetables" : section.title.split(' ')[section.title.split(' ').length - 1]}`} className="text-[10px] font-black uppercase text-primary tracking-widest underline underline-offset-4">See All</Link>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">{section.products.map(p => <ProductCard key={p.id} product={p} />)}</div>
              </section>
            ))}
            <footer className="mt-24 px-6 pb-32 text-center opacity-20">
              <h2 className="font-headline font-black text-3xl text-zinc-900 tracking-tighter uppercase mb-4 italic">comfort in every cart</h2>
              <div className="flex items-center justify-center gap-4 mb-4">
                <div className="h-[1px] w-12 bg-zinc-200" /><p className="font-black text-[10px] text-zinc-400 uppercase tracking-[0.4em]">BAZAARBOLT</p><div className="h-[1px] w-12 bg-zinc-200" />
              </div>
            </footer>
          </>
        )}
      </main>

      <nav className="fixed bottom-2 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] z-50 bg-white/95 backdrop-blur-xl shadow-2xl border border-zinc-200 rounded-full px-6 py-2 flex justify-between items-center">
        <button onClick={() => { setSearchTerm(""); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex flex-col items-center text-zinc-900 active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          <span className="text-[8px] font-black uppercase tracking-widest mt-0.5">Home</span>
        </button>
        <button onClick={() => { setSearchTerm(" "); setTimeout(() => searchInputRef.current?.focus(), 50); }} className="flex flex-col items-center text-zinc-400 active:scale-90 transition-transform"><span className="material-symbols-outlined text-[20px]">search</span><span className="text-[8px] font-black uppercase tracking-widest mt-0.5">Search</span></button>
        <Link href="/orders" className="flex flex-col items-center text-zinc-400 active:scale-90 transition-transform"><span className="material-symbols-outlined text-[20px]">inventory_2</span><span className="text-[8px] font-black uppercase tracking-widest mt-0.5">Orders</span></Link>
        <Link href="/cart" className="flex flex-col items-center text-zinc-400 relative active:scale-95 transition-transform">
          <div className="relative">
            <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
            {cartCount > 0 && <div className="absolute -top-1.5 -right-2 bg-primary text-zinc-900 text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white shadow-sm">{cartCount}</div>}
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest mt-0.5">Cart</span>
        </Link>
      </nav>
    </>
  );
}
