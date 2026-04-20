"use client";

import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Product, CartItem as CartItemType } from "@/types";
import { BottomNav } from "@/components/BottomNav";

export default function CartPage() {
  const { cart, addToCart, updateQuantity, clearCart, settings } = useStore();
  const router = useRouter();

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Billing calculation
  const tax = settings?.taxPercent ? (subtotal * settings.taxPercent) / 100 : 0;
  const deliveryCharge = (settings?.freeDeliveryThreshold && subtotal >= settings.freeDeliveryThreshold) ? 0 : (settings?.deliveryFee || 0);
  const tinyOrderFee = (settings?.smallCartThreshold && subtotal < settings.smallCartThreshold) ? (settings?.smallCartFee || 0) : 0;
  const handlingFee = settings?.handlingCharge || 0;
  
  const total = subtotal + tax + deliveryCharge + tinyOrderFee + handlingFee;

  const handleProceed = () => {
    router.push("/checkout");
  };

  const CartItem = ({ item }: { item: CartItemType }) => (
    <div className="flex items-center gap-4 bg-white p-4 rounded-[28px] border border-zinc-100 shadow-sm transition-all hover:shadow-md">
      <div className="w-20 h-20 bg-zinc-50 rounded-2xl p-2 flex items-center justify-center border border-zinc-100 flex-shrink-0">
        <img className="w-full h-full object-contain" src={item.image} alt={item.name} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[12px] font-black text-zinc-900 leading-tight mb-1 truncate uppercase tracking-tight">{item.name}</h3>
        <p className="text-[11px] font-bold text-zinc-400 mb-2 uppercase">₹{item.price.toFixed(0)}</p>
        <div className="flex items-center justify-between">
           <div className="flex items-center bg-zinc-100 rounded-xl px-1 py-1 h-8 shadow-inner border border-zinc-200">
            <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-zinc-200 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-[10px] font-black">remove</span>
            </button>
            <span className="w-6 text-center font-black text-[10px] text-zinc-900 leading-none">{item.quantity}</span>
            <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-zinc-200 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-[10px] font-black">add</span>
            </button>
          </div>
          <span className="text-sm font-black text-zinc-900 tracking-tighter uppercase">₹{(item.price * item.quantity).toFixed(0)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <main className="bg-zinc-50 min-h-screen pb-44">
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-3xl border-b border-zinc-100 flex flex-col pt-safe">
        <div className="flex items-center px-4 py-5 gap-3">
           <button onClick={() => router.back()} className="p-2 hover:bg-zinc-50 rounded-full transition-colors flex items-center">
             <span className="material-symbols-outlined text-zinc-900 font-bold">arrow_back</span>
           </button>
           <div className="flex flex-col">
             <h1 className="text-xl font-headline font-black text-zinc-900 tracking-tighter leading-none uppercase">Your Cart</h1>
             <span className="text-[10px] font-black text-zinc-400 tracking-widest mt-1 uppercase">{cartCount} {cartCount === 1 ? 'item' : 'items'} in basket</span>
           </div>
           <button onClick={clearCart} className="ml-auto text-[9px] font-black text-red-500 uppercase tracking-widest py-2 px-4 bg-red-50 rounded-full">Clear</button>
        </div>
      </header>

      <div className="pt-24 px-4 space-y-4 max-w-3xl mx-auto">
        {cart.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center px-10">
            <div className="w-24 h-24 bg-zinc-100 rounded-[32px] flex items-center justify-center mb-8 rotate-12">
               <span className="material-symbols-outlined text-zinc-300 text-5xl">shopping_basket</span>
            </div>
            <h2 className="text-3xl font-headline font-black text-zinc-900 tracking-tighter leading-none mb-4 uppercase">Your basket <br /><span className="text-zinc-300 uppercase">is empty</span></h2>
            <p className="text-[11px] font-bold text-zinc-400 tracking-widest leading-relaxed mb-8 uppercase">Ready to start your next order?</p>
            <button onClick={() => router.push("/")} className="bg-zinc-900 text-white px-10 py-4 rounded-[24px] font-black text-[10px] tracking-widest active:scale-95 transition-transform shadow-xl shadow-zinc-200 uppercase">Go Shop</button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-3">
              {cart.map(item => <CartItem key={item.id} item={item} />)}
            </div>

            {/* Bill Details */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-zinc-100">
              <h3 className="text-[11px] font-black text-zinc-400 tracking-widest mb-8 uppercase">Billing details</h3>
              <div className="space-y-5">
                <div className="flex justify-between items-center text-[11px] font-bold text-zinc-500 uppercase">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg">receipt_long</span>
                    <span className="tracking-widest uppercase">Items subtotal</span>
                  </div>
                  <span className="text-zinc-900 font-black uppercase">₹{subtotal.toFixed(0)}</span>
                </div>
                
                <div className="flex justify-between items-center text-[11px] font-bold text-zinc-500 uppercase">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg">delivery_dining</span>
                    <span className="tracking-widest uppercase">Delivery fee</span>
                  </div>
                  <span className="text-zinc-900 font-black uppercase">{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}</span>
                </div>

                {tinyOrderFee > 0 && (
                  <div className="flex justify-between items-center text-[11px] font-bold text-orange-500 uppercase">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-lg">error_outline</span>
                      <span className="tracking-widest uppercase">Small cart charge</span>
                    </div>
                    <span className="font-black uppercase">₹{tinyOrderFee}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-[11px] font-bold text-zinc-500 uppercase">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg">add_task</span>
                    <span className="tracking-widest uppercase">Handling charge</span>
                  </div>
                  <span className="text-zinc-900 font-black uppercase">₹{handlingFee}</span>
                </div>

                <div className="pt-8 mt-4 border-t border-zinc-100 flex justify-between items-center text-[11px] font-bold text-zinc-500 uppercase">
                  <span className="tracking-widest uppercase">GST & Servicing</span>
                  <span className="text-zinc-900 font-black tracking-tight uppercase">₹{tax.toFixed(0)}</span>
                </div>
                <div className="pt-1 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-black text-xl text-zinc-900 tracking-tighter leading-none inline-flex items-center gap-2 uppercase">₹{total.toFixed(0)}</span>
                    <span className="text-[7px] font-black text-primary tracking-[0.2em] mt-1 uppercase">Total payable</span>
                  </div>
                  <button onClick={handleProceed} className="bg-zinc-900 text-white font-black text-[10px] tracking-widest px-6 py-3 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center gap-2 uppercase font-headline">
                    Next step
                    <span className="material-symbols-outlined text-[14px] font-bold">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </main>
  );
}
