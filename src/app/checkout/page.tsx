"use client";

import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { runTransaction, doc, collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { triggerNotification } from "@/lib/notificationClient";
import { Product } from "@/types";
import Link from "next/link";

export default function CheckoutPage() {
  const { cart, addToCart, updateQuantity, clearCart, settings, activeCoupon, selectedAddress, setSelectedAddress } = useStore();
  const { user, userData } = useAuth();

  const router = useRouter();
  
  const [placingOrder, setPlacingOrder] = useState(false);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [instruction, setInstruction] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Bill Calculations
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
  const deliveryCharge = (settings?.freeDeliveryThreshold && subtotal >= settings.freeDeliveryThreshold) ? 0 : (settings?.deliveryFee || 0);
  const smallCartCharge = (settings?.smallCartThreshold && subtotal < settings.smallCartThreshold) ? (settings?.smallCartFee || 0) : 0;
  const handlingFee = settings?.handlingCharge || 0;
  const customChargesTotal = settings?.customCharges?.reduce((acc, c) => acc + c.amount, 0) || 0;

  const total = (subtotal - discountAmount) + tax + deliveryCharge + smallCartCharge + handlingFee + customChargesTotal;

  // Fetch Recommendations
  useEffect(() => {
    if (cart.length === 0) return;
    const cat = cart[0].category;
    const q = query(collection(db, "products"), where("category", "==", cat));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Product))
        .filter(p => !p.isDeleted && p.active && !cart.some(ci => ci.id === p.id))
        .slice(0, 6);
      setRecommendations(items);
    });
    return () => unsub();
  }, [cart]);

  // Fetch Delivery Slots
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "delivery"), (snap) => {
      if (snap.exists()) {
        setAvailableSlots(snap.data().slots || []);
      }
    });
    return () => unsub();
  }, []);

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Please login to place your order");
      router.push("/login?redirect=checkout");
      return;
    }
    if (cart.length === 0) return;
    if (!selectedAddress) {
        toast.error("Please set a delivery address");
        router.push("/");
        return;
    }
    if (!selectedSlot) {
        toast.error("Please select a delivery slot");
        return;
    }
    if (!settings?.storeOpen) {
      toast.error("Store is currently closed.");
      return;
    }

    if (!userData?.name || !userData?.phoneNumber) {
      toast.error("Please update your name and phone number in profile");
      router.push("/profile");
      return;
    }

    setPlacingOrder(true);
    const toastId = toast.loading("Processing order...");

    try {
      const orderRef = doc(collection(db, "orders"));
      
      await runTransaction(db, async (transaction) => {
        const productRefs = cart.map(item => doc(db, "products", item.id));
        const snapshots: any[] = [];
        for (const ref of productRefs) {
          const snap = await transaction.get(ref);
          if (!snap.exists()) throw new Error("Some items are out of stock.");
          snapshots.push(snap);
        }

        cart.forEach((item, index) => {
          const data = snapshots[index].data();
          if (data.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${item.name}.`);
          }
        });

        cart.forEach((item, index) => {
          const ref = productRefs[index];
          const data = snapshots[index].data();
          transaction.update(ref, { stock: data.stock - item.quantity });
        });

        const deliveryCode = Math.floor(1000 + Math.random() * 9000).toString();
        const orderData = {
          userId: user.uid,
          customerName: userData?.name || user.displayName || "Customer",

          items: cart,
          subtotal,
          discountAmount,
          tax,
          total,
          status: "PLACED",
          paymentMethod: "COD",
          instruction,
          deliveryCode,
          deliverySlot: selectedSlot,
          deliveryAddress: selectedAddress,
          createdAt: new Date().toISOString(),
          phoneNumber: userData?.phoneNumber || user.phoneNumber || "+91 00000 00000",

          breakdown: {
            deliveryCharge,
            smallCartCharge,
            handlingFee,
            tax,
            customCharges: settings?.customCharges || []
          }
        };

        transaction.set(orderRef, orderData);
      });

      toast.success("Order Placed Successfully! ⚡️", { id: toastId });
      
      // Notify customer
      triggerNotification({
        userId: user.uid,
        title: "Order Confirmed ✅",
        body: `Your order has been placed. Current status: PLACED`,
      });

      // Notify all riders
      triggerNotification({
        topic: "riders",
        title: "New Delivery 🚴",
        body: "You have a new order to deliver",
      });

      clearCart();
      router.push(`/orders`); 
    } catch (error: any) {
      toast.error(error.message || "Checkout failed", { id: toastId });
    } finally {
      setPlacingOrder(false);
    }
  };

  const RecCard = ({ product }: { product: Product }) => {
    const cartItem = cart.find(c => c.id === product.id);
    return (
      <div className="flex flex-col gap-1 min-w-[100px] max-w-[100px]">
        <div className="relative aspect-square bg-zinc-50 rounded-xl overflow-hidden border border-zinc-100">
          <img className="w-full h-full p-2 object-contain" src={product.image} alt="" />
          <button 
            onClick={() => addToCart({...product, quantity: 1})}
            className="absolute bottom-1 right-1 bg-white border border-green-600 text-green-600 text-[8px] font-black px-2 py-0.5 rounded shadow-sm uppercase"
          >
            ADD
          </button>
        </div>
        <p className="text-[8px] font-black text-zinc-800 line-clamp-1 truncate">{product.name}</p>
        <p className="text-[9px] font-black text-zinc-900">₹{product.price}</p>
      </div>
    );
  };

  const displayAddress = selectedAddress 
    ? `${selectedAddress.line1}, ${selectedAddress.city}` 
    : "No Address Set";

  return (
    <main className="bg-zinc-50 min-h-screen pb-44">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl flex items-center px-4 py-4 border-b border-zinc-100">
        <button onClick={() => router.back()} className="p-2 mr-2">
          <span className="material-symbols-outlined font-bold text-zinc-900">arrow_back</span>
        </button>
        <h1 className="text-lg font-black font-headline text-zinc-900 tracking-tighter uppercase">CHECKOUT</h1>
      </header>

      {cart.length === 0 ? (
        <div className="pt-[140px] flex flex-col items-center justify-center p-10 text-center">
           <span className="material-symbols-outlined text-zinc-200 text-8xl mb-6">shopping_bag</span>
           <h2 className="text-2xl font-black text-zinc-900 mb-2 uppercase">Cart is empty</h2>
           <button onClick={() => router.push("/")} className="bg-primary text-zinc-900 px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest mt-4">Go Shop</button>
        </div>
      ) : (
        <>
          <div className="pt-20 space-y-3 px-4">
            {/* Recommendation Section */}
            {recommendations.length > 0 && (
              <section className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-100">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 mb-4">You might also like</h3>
                 <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                    {recommendations.map(p => <RecCard key={p.id} product={p} />)}
                 </div>
              </section>
            )}

            {/* Delivery Slot Selection */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 mb-4 font-headline">Select Delivery Slot</h3>
               {availableSlots.length > 0 ? (
                 <div className="grid grid-cols-1 gap-2">
                    {availableSlots.map(slot => (
                      <button 
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedSlot === slot ? 'bg-primary/5 border-primary shadow-sm' : 'bg-zinc-50 border-zinc-100 text-zinc-500'}`}
                      >
                        <span className="text-xs font-black uppercase tracking-tight">{slot}</span>
                        {selectedSlot === slot && <span className="material-symbols-outlined text-primary text-sm">check_circle</span>}
                      </button>
                    ))}
                 </div>
               ) : (
                 <p className="text-[10px] font-bold text-zinc-400 uppercase">No slots available right now.</p>
               )}
            </section>

            {/* Bill Details */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6 font-headline">Bill details</h3>
               <div className="space-y-4">
                  <div className="flex justify-between items-center text-[11px] font-bold text-zinc-600">
                     <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">sticky_note_2</span>
                        <span className="uppercase tracking-widest">Items total</span>
                     </div>
                     <span className="text-zinc-900 font-black">₹{subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[11px] font-bold text-zinc-600">
                      <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">delivery_dining</span>
                          <span className="uppercase tracking-widest">Delivery charge</span>
                      </div>
                      <span className="text-zinc-900 font-black">{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}</span>
                    </div>
                    {deliveryCharge > 0 && settings?.freeDeliveryThreshold && (
                      <p className="text-[7px] font-black text-orange-500 uppercase tracking-widest ml-7">Free on orders above ₹{settings.freeDeliveryThreshold}</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[11px] font-bold text-zinc-600">
                     <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">shopping_basket</span>
                        <span className="uppercase tracking-widest">Handling charge</span>
                     </div>
                     <span className="text-zinc-900 font-black">₹{handlingFee}</span>
                  </div>

                  {smallCartCharge > 0 && (
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[11px] font-bold text-zinc-600">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">shopping_cart_checkout</span>
                            <span className="uppercase tracking-widest">Small cart charge</span>
                        </div>
                        <span className="text-zinc-900 font-black">₹${smallCartCharge}</span>
                      </div>
                      <p className="text-[7px] font-black text-orange-500 uppercase tracking-widest ml-7">Applicable on orders below ₹{settings?.smallCartThreshold || 100}</p>
                    </div>
                  )}
                  {settings?.customCharges?.map((c, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] font-bold text-zinc-600">
                       <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">add_circle</span>
                          <span className="uppercase tracking-widest">{c.label}</span>
                       </div>
                       <span className="text-zinc-900 font-black">₹{c.amount}</span>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-zinc-50 flex justify-between items-center text-sm font-black text-zinc-900">
                     <span className="uppercase tracking-widest">Grand total</span>
                     <span className="text-xl tracking-tighter">₹{total.toFixed(0)}</span>
                  </div>
               </div>
            </section>

            {/* Payment Mode Selection */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 mb-6 font-headline">Payment Mode</h3>
               <div className="bg-green-50 border-2 border-green-100 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-green-600 shadow-sm">
                        <span className="material-symbols-outlined">payments</span>
                     </div>
                     <div>
                        <p className="text-xs font-black uppercase text-zinc-900">Cash on Delivery</p>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Pay at your doorstep</p>
                     </div>
                  </div>
                  <span className="material-symbols-outlined text-green-600">check_circle</span>
               </div>
            </section>

            {/* Delivery Instructions */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-900 mb-6 font-headline">Delivery Instructions</h3>
               <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                  {[
                    {id: 'record', icon: 'mic', label: 'Record instruction'},
                    {id: 'door', icon: 'door_open', label: 'Leave at door'},
                    {id: 'guard', icon: 'guardian', label: 'Leave with guard'},
                  ].map(opt => (
                    <button 
                      key={opt.id}
                      onClick={() => setInstruction(opt.id === instruction ? null : opt.id)}
                      className={`flex flex-col items-center justify-center min-w-[100px] h-[100px] rounded-2xl border transition-all ${instruction === opt.id ? 'bg-primary/5 border-primary shadow-inner' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}`}
                    >
                       <span className="material-symbols-outlined mb-2 text-2xl" style={{fontVariationSettings: instruction === opt.id ? "'FILL' 1" : ""}}>{opt.icon}</span>
                       <span className="text-[8px] font-black uppercase tracking-widest text-center px-2">{opt.label}</span>
                    </button>
                  ))}
               </div>
            </section>

            {/* Policy section */}
            <div className="bg-zinc-100 rounded-2xl p-4 opacity-60">
               <p className="text-[9px] font-black text-zinc-900 uppercase tracking-widest mb-1">Cancellation Policy</p>
               <p className="text-[8px] font-bold text-zinc-500 leading-relaxed">Once order placed, cancellation maybe subject to fee. In case of unexpected delays, a complete refund will be provided.</p>
            </div>
          </div>

          {/* Floating Place Order Bar */}
          <div className="fixed bottom-0 left-0 w-full bg-white border-t border-zinc-100 p-4 z-[60] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
               <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-zinc-900" style={{fontVariationSettings: "'FILL' 1"}}>home</span>
                    <p className="text-[10px] font-black text-zinc-900 uppercase">{selectedSlot ? `Deliver ${selectedSlot.split(' ')[0]}` : 'Set Slot'}</p>
                  </div>
                  <p className="text-[8px] font-bold text-zinc-400 truncate max-w-[140px] ml-6">{displayAddress}</p>
               </div>
               <button 
                 onClick={handleCheckout}
                 disabled={placingOrder}
                 className="flex-1 bg-green-600 text-white h-14 rounded-xl flex items-center justify-between px-6 active:scale-[0.98] transition-all disabled:opacity-50"
               >
                  <div className="flex flex-col items-start leading-none">
                     <span className="text-[14px] font-black">₹{total.toFixed(0)}</span>
                     <span className="text-[8px] font-bold uppercase tracking-widest opacity-80">TOTAL</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[14px] font-black uppercase tracking-widest">{placingOrder ? 'Processing...' : 'Place Order'}</span>
                     <span className="material-symbols-outlined text-sm">arrow_right</span>
                  </div>
               </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

