"use client";

import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { runTransaction, doc, collection, query, where, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { triggerNotification } from "@/lib/notificationClient";
import { Product } from "@/types";
import Link from "next/link";

export default function CheckoutPage() {
  const { cart, addToCart, clearCart, settings, activeCoupon, selectedAddress, products } = useStore();
  const { user, userData } = useAuth();
  const router = useRouter();
  const [placingOrder, setPlacingOrder] = useState(false);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [instruction, setInstruction] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

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

  const tax = settings?.taxPercent ? ((subtotal - discountAmount) * settings.taxPercent) / 100 : 0;
  const deliveryCharge = (settings?.freeDeliveryThreshold && subtotal >= settings.freeDeliveryThreshold) ? 0 : (settings?.deliveryFee || 0);
  const smallCartCharge = (settings?.smallCartThreshold && subtotal < settings.smallCartThreshold) ? (settings?.smallCartFee || 0) : 0;
  const handlingFee = settings?.handlingCharge || 0;
  const customChargesTotal = settings?.customCharges?.reduce((acc, c) => acc + c.amount, 0) || 0;

  const total = (subtotal - discountAmount) + tax + deliveryCharge + smallCartCharge + handlingFee + customChargesTotal;

  useEffect(() => {
    if (cart.length === 0 || products.length === 0) return;
    const cat = cart[0].category;
    const items = products
      .filter(p => !p.isDeleted && p.active && (p.category === cat) && !cart.some(ci => ci.id === p.id))
      .slice(0, 6);
    setRecommendations(items);
  }, [cart, products]);

  useEffect(() => {
    async function fetchSlots() {
      const snap = await getDoc(doc(db, "settings", "delivery"));
      if (snap.exists()) {
        const slots = snap.data().slots || [];
        setAvailableSlots(slots);
      }
    }
    fetchSlots();
  }, []);

  const getFilteredSlots = () => {
    const isToday = selectedDate === new Date().toLocaleDateString('en-CA');
    if (!isToday) return availableSlots;

    const now = new Date();
    return availableSlots.filter(slot => {
      try {
        // Robust parsing using Regex: matches "10:30 AM", "12:30PM", "9:00 PM", etc.
        const timeMatch = slot.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!timeMatch) return true;

        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const modifier = timeMatch[3].toUpperCase();

        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;

        const slotStartTime = new Date();
        slotStartTime.setHours(hours, minutes, 0, 0);

        // Lead time: Slot must be booked at least 15 minutes before it starts
        const bufferTime = new Date(slotStartTime.getTime() - 15 * 60000);
        return now < bufferTime;
      } catch (e) {
        return true;
      }
    });
  };

  const filteredSlots = getFilteredSlots();

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
    if (settings && settings.storeOpen === false) {
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
          if (data.stock < item.quantity) throw new Error(`Insufficient stock for ${item.name}.`);
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
          deliveryDate: selectedDate,
          deliverySlot: selectedSlot,
          deliveryAddress: selectedAddress,
          createdAt: new Date().toISOString(),
          phoneNumber: userData?.phoneNumber || user.phoneNumber || "+91 00000 00000",
          breakdown: { deliveryCharge, smallCartCharge, handlingFee, tax, customCharges: settings?.customCharges || [] }
        };
        transaction.set(orderRef, orderData);
      });

      toast.success("Order placed successfully! ⚡️", { id: toastId });
      triggerNotification({ userId: user.uid, title: "Order confirmed ✅", body: "Your order has been placed successfully!" });
      triggerNotification({ topic: "riders", title: "New delivery 🚴", body: "New delivery task available!" });
      clearCart();
      router.push(`/orders`);
    } catch (error: any) {
      toast.error(error.message || "Checkout failed", { id: toastId });
    } finally {
      setPlacingOrder(false);
    }
  };

  const RecCard = ({ product }: { product: Product }) => (
    <div className="flex flex-col gap-1 min-w-[100px] max-w-[100px]">
      <div className="relative aspect-square bg-zinc-50 rounded-xl overflow-hidden border border-zinc-100">
        <img className="w-full h-full p-2 object-contain" src={product.image} alt="" />
        <button onClick={() => addToCart({...product, quantity: 1})} className="absolute bottom-1 right-1 bg-white border border-green-600 text-green-600 text-[8px] font-black px-2 py-0.5 rounded shadow-sm">Add</button>
      </div>
      <p className="text-[8px] font-bold text-zinc-800 line-clamp-1 truncate">{product.name}</p>
      <p className="text-[9px] font-black text-zinc-900">₹{product.price}</p>
    </div>
  );

  const displayAddress = selectedAddress ? `${selectedAddress.line1}, ${selectedAddress.city}` : "No address set";

  const next7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date: d.toLocaleDateString('en-CA'),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
    };
  });

  return (
    <main className="bg-zinc-50 min-h-screen pb-44">
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl flex items-center px-4 pt-safe pt-8 pb-4 border-b border-zinc-100">
        <button onClick={() => router.back()} className="p-2 mr-2"><span className="material-symbols-outlined font-bold text-zinc-900">arrow_back</span></button>
        <h1 className="text-lg font-black font-headline text-zinc-900 tracking-tighter">Checkout</h1>
      </header>

      {cart.length === 0 ? (
        <div className="pt-[180px] flex flex-col items-center justify-center p-10 text-center">
          <span className="material-symbols-outlined text-zinc-200 text-8xl mb-6">shopping_bag</span>
          <h2 className="text-2xl font-black text-zinc-900 mb-2">Cart is empty</h2>
          <button onClick={() => router.push("/")} className="bg-primary text-zinc-900 px-8 py-3 rounded-2xl font-black text-[10px] tracking-widest mt-4">Go shop</button>
        </div>
      ) : (
        <>
          <div className="pt-32 space-y-3 px-4">
            {recommendations.length > 0 && (
              <section className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-100">
                <h3 className="text-[10px] font-black tracking-widest text-zinc-900 mb-4">You might also like</h3>
                <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                  {recommendations.map(p => <RecCard key={p.id} product={p} />)}
                </div>
              </section>
            )}

            <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100">
              <h3 className="text-[10px] font-black tracking-widest text-zinc-400 mb-4 uppercase">Select Date & Slot</h3>
              
              <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-6">
                {next7Days.map(d => (
                  <button key={d.date} onClick={() => { setSelectedDate(d.date); setSelectedSlot(null); }} className={`flex flex-col items-center justify-center min-w-[100px] py-4 rounded-2xl border transition-all ${selectedDate === d.date ? 'bg-primary/5 border-primary shadow-inner' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}`}>
                    <span className="text-[10px] font-black tracking-widest uppercase">{d.label}</span>
                  </button>
                ))}
              </div>

              {filteredSlots.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {filteredSlots.map(slot => (
                    <button key={slot} onClick={() => setSelectedSlot(slot)} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedSlot === slot ? 'bg-primary/5 border-primary shadow-sm' : 'bg-zinc-50 border-zinc-100 text-zinc-500'}`}>
                      <span className="text-xs font-black tracking-tight">{slot}</span>
                      {selectedSlot === slot && <span className="material-symbols-outlined text-primary text-sm">check_circle</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                  <span className="material-symbols-outlined text-zinc-200 text-4xl mb-2">schedule</span>
                  <p className="text-[10px] font-bold text-zinc-400">No more slots available for today.</p>
                  <p className="text-[8px] font-black text-primary uppercase mt-1">Try selecting a different date</p>
                </div>
              )}
            </section>

            <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100">
              <h3 className="text-[10px] font-black tracking-widest text-zinc-400 mb-6">Bill details</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[11px] font-bold text-zinc-600">
                  <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">sticky_note_2</span><span className="tracking-widest capitalize">Items total</span></div>
                  <span className="text-zinc-900 font-black">₹{subtotal.toFixed(0)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[11px] font-bold text-zinc-600">
                    <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">delivery_dining</span><span className="tracking-widest capitalize">Delivery charge</span></div>
                    <span className="text-zinc-900 font-black text-[10px]">{deliveryCharge === 0 ? 'Free' : `₹${deliveryCharge}`}</span>
                  </div>
                  {deliveryCharge > 0 && settings?.freeDeliveryThreshold && <p className="text-[7px] font-black text-orange-500 tracking-widest ml-7">Free on orders above ₹{settings.freeDeliveryThreshold}</p>}
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold text-zinc-600">
                  <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">shopping_basket</span><span className="tracking-widest capitalize">Handling fee</span></div>
                  <span className="text-zinc-900 font-black">₹{handlingFee}</span>
                </div>
                {smallCartCharge > 0 && (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[11px] font-bold text-zinc-600">
                      <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">shopping_cart_checkout</span><span className="tracking-widest capitalize">Small cart charge</span></div>
                      <span className="text-zinc-900 font-black">₹{smallCartCharge}</span>
                    </div>
                    <p className="text-[7px] font-black text-orange-500 tracking-widest ml-7">Orders below ₹{settings?.smallCartThreshold || 100}</p>
                  </div>
                )}
                {settings?.customCharges?.map((c, i) => (
                  <div key={i} className="flex justify-between items-center text-[11px] font-bold text-zinc-600">
                    <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">add_circle</span><span className="tracking-widest capitalize">{c.label}</span></div>
                    <span className="text-zinc-900 font-black">₹{c.amount}</span>
                  </div>
                ))}
                <div className="pt-4 border-t border-zinc-50 flex justify-between items-center text-sm font-black text-zinc-900">
                  <span className="tracking-widest">Grand total</span>
                  <span className="text-xl tracking-tighter">₹{total.toFixed(0)}</span>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100">
              <h3 className="text-[10px] font-black tracking-widest text-zinc-900 mb-6">Payment mode</h3>
              <div className="bg-green-50 border-2 border-green-100 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-green-600 shadow-sm"><span className="material-symbols-outlined">payments</span></div>
                  <div>
                    <p className="text-xs font-black text-zinc-900">Cash on delivery</p>
                    <p className="text-[9px] font-bold text-zinc-400 tracking-widest">Pay at doorstep</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-green-600">check_circle</span>
              </div>
            </section>

            <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100">
              <h3 className="text-[10px] font-black tracking-widest text-zinc-900 mb-6">Delivery instructions</h3>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                {[{id: 'door', icon: 'door_open', label: 'At door'}, {id: 'guard', icon: 'guardian', label: 'With guard'}].map(opt => (
                  <button key={opt.id} onClick={() => setInstruction(opt.id === instruction ? null : opt.id)} className={`flex flex-col items-center justify-center min-w-[100px] h-[100px] rounded-2xl border transition-all ${instruction === opt.id ? 'bg-primary/5 border-primary shadow-inner' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}`}>
                    <span className="material-symbols-outlined mb-2 text-2xl" style={{fontVariationSettings: instruction === opt.id ? "'FILL'1" : ""}}>{opt.icon}</span>
                    <span className="text-[8px] font-black tracking-widest text-center px-2">{opt.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="fixed bottom-0 left-0 w-full bg-white border-t border-zinc-100 p-4 z-[60] shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
              <div className="flex flex-col overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-zinc-900" style={{fontVariationSettings: "'FILL'1"}}>home</span>
                  <p className="text-[10px] font-black text-zinc-900 truncate">{selectedSlot || 'Set slot'}</p>
                </div>
                <p className="text-[8px] font-bold text-zinc-400 truncate max-w-[140px] ml-6">{displayAddress}</p>
              </div>
              <button onClick={handleCheckout} disabled={placingOrder} className="flex-1 bg-green-600 text-white h-14 rounded-xl flex items-center justify-between px-6 active:scale-[0.98] transition-all disabled:opacity-50">
                <div className="flex flex-col items-start leading-none"><span className="text-[14px] font-black">₹{total.toFixed(0)}</span><span className="text-[8px] font-bold tracking-widest opacity-80">Total</span></div>
                <div className="flex items-center gap-2"><span className="text-[14px] font-black tracking-widest">{placingOrder ? 'Wait...' : 'Place order'}</span><span className="material-symbols-outlined text-sm">arrow_right</span></div>
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
