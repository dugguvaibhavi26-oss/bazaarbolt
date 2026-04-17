"use client";

import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, settings, activeCoupon, applyCoupon, removeCoupon, selectedAddress } = useStore();
  const { user } = useAuth();
  const router = useRouter();

  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponCode, setCouponCode] = useState("");

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  let discountAmount = 0;
  if (activeCoupon) {
    if (activeCoupon.code === "WELCOME50") {
      discountAmount = 50;
    } else {
      discountAmount = (subtotal * activeCoupon.discount) / 100;
    }
    if (discountAmount > subtotal) discountAmount = subtotal;
  }

  // Dynamic Charges
  const tax = settings?.taxPercent ? ((subtotal - discountAmount) * settings.taxPercent) / 100 : 0;
  const deliveryFee = (settings?.freeDeliveryThreshold && subtotal >= settings.freeDeliveryThreshold) ? 0 : (settings?.deliveryFee || 0);
  const smallCartFee = (settings?.smallCartThreshold && subtotal < settings.smallCartThreshold) ? (settings?.smallCartFee || 0) : 0;
  const handlingCharge = settings?.handlingCharge || 0;
  const customChargesTotal = settings?.customCharges?.reduce((acc, c) => acc + c.amount, 0) || 0;

  const total = (subtotal - discountAmount) + tax + deliveryFee + smallCartFee + handlingCharge + customChargesTotal;

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const displayAddress = selectedAddress 
    ? `${selectedAddress.line1}, ${selectedAddress.city}` 
    : "Select Delivery Address";

  const handleProceed = () => {
    if (cart.length === 0) return;
    router.push("/checkout");
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    applyCoupon(couponCode);
    setShowCouponInput(false);
    setCouponCode("");
  };

  return (
    <main className="bg-zinc-50 min-h-screen">
      {/* Announcement Banner */}
      <div className="fixed top-0 left-0 w-full h-8 bg-black text-white flex items-center overflow-hidden z-[60]">
        <div className="flex whitespace-nowrap animate-marquee">
          <span className="text-[10px] font-black uppercase tracking-widest px-4">{settings?.announcement || "⚡️ Free delivery above ₹99 • Rapid delivery in 10 mins ⚡️"}</span>
          <span className="text-[10px] font-black uppercase tracking-widest px-4">{settings?.announcement || "⚡️ Free delivery above ₹99 • Rapid delivery in 10 mins ⚡️"}</span>
        </div>
      </div>

      {/* Header */}
      <header className="fixed top-8 w-full z-50 bg-white/95 backdrop-blur-2xl shadow-sm flex flex-col pt-3 pb-3 border-b border-zinc-100 transition-all">
        <div className="flex items-center justify-between px-4 w-full">
          <div className="flex flex-col cursor-pointer group" onClick={() => router.push("/")}>
            <div className="flex items-center gap-1">
               <span className="text-[10px] font-black uppercase text-zinc-900 tracking-wider">Cart Delivery</span>
               <span className="material-symbols-outlined text-primary text-[14px] font-bold">expand_more</span>
            </div>
            <span className="text-xs font-extrabold font-headline tracking-tight text-zinc-500 truncate max-w-[220px]">{displayAddress}</span>
          </div>
          <div className="flex items-center gap-3">
             <Link href={user ? "/profile" : "/login"} className="p-1 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors shadow-sm">
                <span className="material-symbols-outlined text-zinc-900 text-xl align-middle" style={{fontVariationSettings: "'FILL' 1"}}>{user ? 'account_circle' : 'login'}</span>
             </Link>
          </div>
        </div>
      </header>

      <div className="pt-28 pb-44 px-4 max-w-3xl mx-auto space-y-4">
        <div className="flex items-end justify-between px-1">
           <h2 className="font-headline font-black text-2xl tracking-tighter text-zinc-900 italic uppercase">Your Cart</h2>
           <span className="font-headline font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md text-[10px] tracking-widest uppercase">{cartCount} ITEMS</span>
        </div>

        {cartCount === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-zinc-100 flex flex-col items-center">
            <span className="material-symbols-outlined text-6xl text-zinc-100 mb-4" style={{fontVariationSettings: "'FILL' 1"}}>shopping_bag</span>
            <h2 className="text-zinc-600 font-headline font-black text-lg mb-2">Empty Cart</h2>
            <p className="text-zinc-400 text-sm font-bold mb-6">Looks like you haven't added anything yet</p>
            <Link href="/" className="inline-flex items-center text-zinc-900 font-headline font-black text-xs uppercase tracking-widest bg-primary px-8 py-4 rounded-2xl shadow-lg active:scale-95 transition-transform">
              Explore Store
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-2.5 flex items-center gap-3 shadow-sm border border-zinc-100 relative group transition-all">
                <button 
                  onClick={() => removeFromCart(item.id)} 
                  className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-zinc-50 text-zinc-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-all active:scale-90"
                >
                  <span className="material-symbols-outlined text-xs font-black">close</span>
                </button>
                <div className="w-14 h-14 bg-zinc-50 rounded-xl overflow-hidden shrink-0 border border-zinc-50">
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1.5" />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <h3 className="font-black text-xs truncate text-zinc-900 mb-0.5">{item.name}</h3>
                  <p className="text-zinc-400 text-[8px] font-bold uppercase tracking-widest mb-1.5">{item.category}</p>
                  <p className="font-black text-sm text-zinc-900 tracking-tighter">₹{(item.price * item.quantity).toFixed(0)}</p>
                </div>
                <div className="flex items-center bg-zinc-50 rounded-lg px-0.5 py-0.5 border border-zinc-100 h-8">
                  <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-white rounded shadow-sm">
                    <span className="material-symbols-outlined text-xs font-black text-zinc-900">remove</span>
                  </button>
                  <span className="w-7 text-center font-black text-xs text-zinc-900">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-white rounded shadow-sm">
                    <span className="material-symbols-outlined text-xs font-black text-zinc-900">add</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Coupons Section */}
            <div className="mt-6">
               {activeCoupon ? (
                 <div className="flex items-center justify-between bg-primary/5 border border-primary/20 p-3 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-zinc-900">
                         <span className="material-symbols-outlined text-lg font-black">local_activity</span>
                      </div>
                      <div className="flex flex-col">
                         <span className="font-black text-[9px] uppercase tracking-widest text-zinc-900">'{activeCoupon.code}' Matched</span>
                         <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-wider">Saving ₹{discountAmount.toFixed(0)}</span>
                      </div>
                    </div>
                    <button onClick={removeCoupon} className="bg-white px-2 py-1 rounded text-red-500 font-black text-[8px] uppercase tracking-widest border border-red-50 active:scale-95">Cancel</button>
                 </div>
               ) : showCouponInput ? (
                 <form onSubmit={handleApplyCoupon} className="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-primary transition-all">
                    <input 
                      type="text" 
                      placeholder="ENTER PROMO CODE" 
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-grow bg-transparent border-none outline-none px-2 font-black text-xs uppercase tracking-widest"
                      autoFocus
                    />
                    <button type="submit" className="bg-zinc-900 text-white font-black text-[8px] px-4 py-2 rounded uppercase tracking-widest active:scale-95 transition-transform">Apply</button>
                 </form>
               ) : (
                  <div onClick={() => setShowCouponInput(true)} className="flex items-center justify-between bg-white border border-zinc-100 p-3 rounded-2xl shadow-sm cursor-pointer hover:border-primary transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 group-hover:bg-primary/20 group-hover:text-zinc-900 transition-colors">
                        <span className="material-symbols-outlined text-lg" style={{fontVariationSettings: "'FILL' 1"}}>local_activity</span>
                      </div>
                      <span className="font-black text-[10px] uppercase tracking-widest text-zinc-900">Unlock Savings / Promos</span>
                    </div>
                    <span className="material-symbols-outlined text-zinc-300 text-sm group-hover:translate-x-1 transition-transform">chevron_right</span>
                  </div>
               )}
            </div>

            {/* Bill Info */}
            <div className="mt-6 space-y-3">
               <h3 className="font-black text-[8px] uppercase tracking-[0.2em] text-zinc-400 ml-1">Billing Summary</h3>
               <div className="bg-white rounded-3xl p-5 space-y-3 shadow-sm border border-zinc-100 relative overflow-hidden">
                  <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500">
                    <span className="uppercase tracking-widest">Cart Subtotal</span>
                    <span className="text-zinc-900 font-black tracking-tight">₹{subtotal.toFixed(0)}</span>
                  </div>
                  
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-[10px] font-bold">
                       <span className="text-green-600 uppercase tracking-widest">Coupon Savings</span>
                       <span className="text-green-600 font-black tracking-tight">-₹{discountAmount.toFixed(0)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500">
                    <span className="uppercase tracking-widest">Rapid Delivery Fee</span>
                    <div className="flex items-center gap-2">
                       {deliveryFee === 0 && settings?.deliveryFee && <span className="text-zinc-300 line-through text-[8px]">₹{settings.deliveryFee}</span>}
                       <span className="text-primary font-black uppercase text-[8px] tracking-widest">{deliveryFee === 0 ? 'ZERO FEE' : `₹${deliveryFee}`}</span>
                    </div>
                  </div>

                  {smallCartFee > 0 && (
                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500">
                      <span className="uppercase tracking-widest">Small Cart Charge</span>
                      <span className="text-zinc-900 font-black tracking-tight">₹{smallCartFee}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500">
                    <span className="uppercase tracking-widest">Handling & Platform</span>
                    <span className="text-zinc-900 font-black tracking-tight">₹{handlingCharge}</span>
                  </div>

                  {settings?.customCharges?.map((c, i) => (
                    <div key={i} className="flex justify-between items-center text-[10px] font-bold text-zinc-500">
                      <span className="uppercase tracking-widest">{c.label}</span>
                      <span className="text-zinc-900 font-black tracking-tight">₹{c.amount}</span>
                    </div>
                  ))}

                  <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 pb-3 border-b border-zinc-50">
                    <span className="uppercase tracking-widest">GST & Servicing</span>
                    <span className="text-zinc-900 font-black tracking-tight">₹{tax.toFixed(0)}</span>
                  </div>

                  <div className="pt-1 flex justify-between items-center">
                    <div className="flex flex-col">
                       <span className="font-black text-xl text-zinc-900 tracking-tighter leading-none inline-flex items-center gap-2">
                          ₹{total.toFixed(0)}
                       </span>
                       <span className="text-[7px] font-black text-primary uppercase tracking-[0.2em] mt-1">Total Payable</span>
                    </div>
                    <button onClick={handleProceed} className="bg-zinc-900 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center gap-2">
                       Next Step
                       <span className="material-symbols-outlined text-[14px] font-bold">arrow_forward</span>
                    </button>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Curved NavBar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] z-50 bg-white/95 backdrop-blur-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] border border-white/40 rounded-full px-6 py-2.5 flex justify-between items-center transition-all">
          <button onClick={() => router.push("/")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-all">
            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">home</span>
            <span className="font-headline text-[8px] font-black uppercase tracking-widest mt-0.5 text-zinc-400 group-hover:text-zinc-900">Home</span>
          </button>
          
          <button onClick={() => router.push("/orders")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-all">
            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">history</span>
            <span className="font-headline text-[8px] font-black uppercase tracking-widest mt-0.5 text-zinc-400 group-hover:text-zinc-900">Orders</span>
          </button>
          
          <button onClick={() => router.push("/help")} className="flex flex-col items-center justify-center text-zinc-400 hover:text-zinc-900 group active:scale-95 transition-all">
            <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">support_agent</span>
            <span className="font-headline text-[8px] font-black uppercase tracking-widest mt-0.5 text-zinc-400 group-hover:text-zinc-900">Support</span>
          </button>

          <button onClick={() => {}} className="flex flex-col items-center justify-center text-zinc-900 group active:scale-95 transition-transform relative">
            <div className="relative">
              <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform" style={{fontVariationSettings: "'FILL' 1"}}>shopping_bag</span>
              {cartCount > 0 && (
                <div className="absolute -top-1.5 -right-2 bg-primary text-zinc-900 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center pointer-events-none shadow-sm shadow-primary/40 border-white">
                  {cartCount}
                </div>
              )}
            </div>
            <span className="font-headline text-[8px] font-black uppercase tracking-widest mt-0.5 text-zinc-900">Cart</span>
          </button>
      </nav>
    </main>
  );
}
