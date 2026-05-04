"use client";

import { use, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types";
import { useRouter } from "next/navigation";
import { mapOrder } from "@/lib/mappers";

export default function OrderTracking({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [rider, setRider] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!resolvedParams.id) return;
    
    const unsubOrder = onSnapshot(doc(db, "orders", resolvedParams.id), {
      next: (docSnap) => {
        try {
          if (docSnap.exists()) {
            const orderData = mapOrder(docSnap);
            
            // Check for newly unavailable items to show a toast alert
            if (order) {
              const newlyUnavailable = orderData.items.find((item, idx) => item.unavailable && !order.items[idx]?.unavailable);
              if (newlyUnavailable) {
                import("react-hot-toast").then(t => 
                  t.default.error(`Item update: ${newlyUnavailable.name} is out of stock. Order total updated.`, {
                    duration: 6000,
                    icon: '⚠️'
                  })
                );
              }
            }

            setOrder(orderData);
            
            if (orderData.riderId && !rider) {
              const unsubRider = onSnapshot(doc(db, "users", orderData.riderId), {
                next: (rSnap) => {
                  if (rSnap.exists()) setRider(rSnap.data());
                },
                error: (err) => {
                  console.warn("Rider lookup permission restricted:", err);
                }
              });
              return () => unsubRider();
            }
          }
        } catch (e) {
          console.error("Tracking mapping error:", e);
        }
      },
      error: (err) => {
        console.error("Order tracking error:", err);
      }
    });

    return () => unsubOrder();
  }, [resolvedParams.id, !!order, !!rider]);

  if (!order) return (
    <div className="min-h-[100dvh] bg-surface flex items-center justify-center space-x-2">
      <div className="w-4 h-4 bg-primary rounded-full animate-bounce"></div>
      <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
      <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
    </div>
  );

  const getStatusDisplay = () => {
    const status = order.status.toUpperCase();
    switch (status) {
      case "PLACED": return { title: "Order placed", desc: "Store is packing your items", percent: "w-1/4", icon: "inventory_2", color: "text-blue-600" };
      case "ACCEPTED": return { title: "Rider assigned", desc: "Heading to the store", percent: "w-2/4", icon: "delivery_dining", color: "text-primary" };
      case "PICKED": return { title: "Picked up", desc: "Rider has your package", percent: "w-3/4", icon: "shopping_basket", color: "text-orange-500" };
      case "ON_THE_WAY": return { title: "On the way", desc: "Rider is nearby!", percent: "w-[90%]", icon: "bolt", color: "text-primary" };
      case "DELIVERED": return { title: "Delivered", desc: "Enjoy your items!", percent: "w-full", icon: "task_alt", color: "text-green-600" };
      default: return { title: order.status, desc: "Processing...", percent: "w-1/4", icon: "pending_actions", color: "text-zinc-500" };
    }
  };

  const handleCancel = async () => {
    if (!order || order.status !== "PLACED") return;
    if (!confirm("Are you sure you want to cancel this order?")) return;

    setCancelling(true);
    const { runTransaction, collection, doc } = await import("firebase/firestore");
    
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, "orders", order.id!);
        const currentOrderSnap = await transaction.get(orderRef);
        
        if (!currentOrderSnap.exists()) throw new Error("Order not found");
        if (currentOrderSnap.data().status !== "PLACED") throw new Error("Rider already assigned. Cannot cancel.");

        // First: Read all product snapshots
        const productRefs = order.items.map(item => doc(db, "products", item.id));
        const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        // Second: Execute all writes
        productSnaps.forEach((prodSnap, idx) => {
          if (prodSnap.exists()) {
            const item = order.items[idx];
            const currentStock = prodSnap.data()?.stock || 0;
            transaction.update(prodSnap.ref, { stock: currentStock + item.quantity });
          }
        });

        transaction.update(orderRef, { status: "CANCELLED" });
      });
      
      const t = await import("react-hot-toast");
      t.default.success("Order cancelled successfully");
    } catch (e: any) {
      const t = await import("react-hot-toast");
      t.default.error(e.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const [replacingItemIndex, setReplacingItemIndex] = useState<number | null>(null);
  const [vendorProducts, setVendorProducts] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());
  const { Portal } = require("@/components/Portal");

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchVendorProducts = async (vendorId: string | undefined) => {
    if (!vendorId) return;
    const { getDocs, query, collection, where } = await import("firebase/firestore");
    const q = query(collection(db, "products"), where("vendorId", "==", vendorId), where("active", "==", true));
    const snap = await getDocs(q);
    setVendorProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleReplaceClick = (idx: number, vendorId: string | undefined) => {
    setReplacingItemIndex(idx);
    fetchVendorProducts(vendorId);
  };

  const handleReplace = async (product: any) => {
    if (replacingItemIndex === null || !order) return;
    const oldItem = order.items[replacingItemIndex];
    
    const newItem = {
      ...product,
      quantity: 1, // Defaulting replacement to qty 1 to be safe
    };
    
    const updatedItems = [...order.items];
    updatedItems[replacingItemIndex] = { ...oldItem, replacedBy: product.id };
    updatedItems.push(newItem);
    
    const activeItems = updatedItems.filter(i => !i.unavailable);
    const newSubtotal = activeItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const taxPercent = order.subtotal > 0 ? (order.tax / order.subtotal) : 0.05;
    const newTax = newSubtotal * taxPercent;
    const fixedCharges = order.total - order.subtotal - order.tax;
    const newTotal = newSubtotal + newTax + (fixedCharges > 0 ? fixedCharges : 0);

    const { updateDoc } = await import("firebase/firestore");
    await updateDoc(doc(db, "orders", order.id!), {
      items: updatedItems,
      subtotal: parseFloat(newSubtotal.toFixed(2)),
      tax: parseFloat(newTax.toFixed(2)),
      total: parseFloat(newTotal.toFixed(2))
    });
    
    setReplacingItemIndex(null);
    const t = await import("react-hot-toast");
    t.default.success("Item replaced successfully!");
  };

  const statusInfo = getStatusDisplay();
  const isDelivered = order.status.toUpperCase() === "DELIVERED";

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] border-b border-zinc-100 pt-safe">
        <div className="flex items-center justify-between px-4 py-4 pt-2 w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/orders')} className="p-2 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors">
              <span className="material-symbols-outlined text-zinc-900 font-bold">arrow_back</span>
            </button>
            <div className="flex flex-col leading-none">
              <span className="font-headline font-black tracking-tight text-lg text-zinc-900 leading-none">Order status</span>
              <span className="text-[10px] font-bold text-zinc-400 tracking-widest mt-1">ID: #{order.id?.slice(-8).toUpperCase()}</span>
            </div>
          </div>
          <button onClick={() => router.push('/help')} className="text-[10px] font-black text-primary px-3 py-1.5 bg-primary/10 rounded-lg tracking-widest border border-primary/20">Get help</button>
        </div>
      </header>

      <main className="pt-[calc(100px+env(safe-area-inset-top,0px))] pb-32 px-4 max-w-2xl mx-auto space-y-6 text-[#1A1A1A]">
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.08)] border border-zinc-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] pointer-events-none"></div>
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1 text-[#1A1A1A]">
              <h2 className="font-headline font-black text-3xl tracking-tighter text-zinc-900 leading-[1.1] mb-2">
                {isDelivered ? "Delivered with love! 💛" : statusInfo.title}
              </h2>
              <p className="font-headline font-bold text-sm text-zinc-500">{statusInfo.desc}</p>
            </div>
            {!isDelivered ? (
              <div className="w-16 h-16 shrink-0 bg-primary/10 rounded-2xl flex items-center justify-center animate-pulse">
                <span className={`material-symbols-outlined text-4xl font-bold ${statusInfo.color}`} style={{ fontVariationSettings: "'FILL'1" }}>{statusInfo.icon}</span>
              </div>
            ) : (
              <div className="w-16 h-16 shrink-0 bg-green-50 rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl font-bold text-green-600" style={{ fontVariationSettings: "'FILL'1" }}>verified</span>
              </div>
            )}
          </div>

          <div className="relative h-2.5 bg-zinc-100 rounded-full overflow-hidden mb-8">
            <div className={`absolute top-0 left-0 h-full bg-primary rounded-full ${statusInfo.percent} transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(34,197,94,0.4)]`}></div>
          </div>

          {!isDelivered && (
            <div className="bg-zinc-50 border border-zinc-100 py-3.5 px-6 rounded-2xl flex items-center justify-between">
              <span className="font-headline font-black text-[10px] tracking-widest text-zinc-400">Delivery PIN</span>
              <span className="font-headline font-black text-3xl tracking-[0.2em] text-zinc-900">{order.deliveryCode}</span>
            </div>
          )}
        </div>

        {!isDelivered && rider && (
          <div className="bg-white rounded-[32px] shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] border border-zinc-100 overflow-hidden">
            <div className="h-24 bg-zinc-50 flex items-center justify-center border-b border-zinc-100 relative">
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
              <span className="material-symbols-outlined text-zinc-400 text-3xl animate-bounce" style={{ fontVariationSettings: "'FILL'1" }}>motorcycle</span>
              <span className="text-zinc-500 font-black text-xs tracking-widest ml-3">Rider is flying to you</span>
            </div>

            <div className="px-6 py-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-zinc-100 rounded-full border-2 border-primary/20 overflow-hidden shrink-0 flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-zinc-400 text-3xl">account_circle</span>
                </div>
                <div>
                  <h3 className="font-headline font-black text-lg text-zinc-900 leading-none mb-1.5">{rider.name || "Bolt Rider"}</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[10px] font-black text-zinc-500 tracking-widest">
                      <span className="material-symbols-outlined text-[12px] text-yellow-500" style={{ fontVariationSettings: "'FILL'1" }}>star</span>
                      4.9 Rating
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-black text-zinc-500 tracking-widest">
                      <span className="material-symbols-outlined text-[12px] text-primary" style={{ fontVariationSettings: "'FILL'1" }}>bolt</span>
                      Electric
                    </div>
                  </div>
                </div>
              </div>
              <a href={`tel:${rider.phoneNumber}`} className="w-12 h-12 bg-primary text-zinc-900 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all">
                <span className="material-symbols-outlined">call</span>
              </a>
            </div>
          </div>
        )}

        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.06)] border border-zinc-100">
          <h3 className="text-[11px] font-black text-zinc-400 tracking-widest mb-8">Shipment checklist</h3>
          <div className="space-y-6">
            {order.items.map((item, idx) => {
              const isRejected = item.vendorStatus === "REJECTED" && !item.replacedBy;
              const timeSinceRejection = item.unavailableAt ? now - new Date(item.unavailableAt).getTime() : 0;
              const timeRemaining = Math.max(0, 30 * 60 * 1000 - timeSinceRejection);
              const minutesLeft = Math.floor(timeRemaining / 60000);
              const secondsLeft = Math.floor((timeRemaining % 60000) / 1000);
              const canReplace = isRejected && timeRemaining > 0;

              return (
                <div key={idx} className={`flex flex-col gap-3 group ${item.replacedBy ? 'opacity-50 grayscale' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-zinc-50 rounded-2xl p-2 border border-zinc-100 shrink-0">
                      <img src={item.image} alt="" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-black text-zinc-900 leading-tight mb-1 truncate ${item.unavailable ? 'line-through text-red-500' : ''}`}>{item.name}</p>
                      <p className="text-[10px] font-bold text-zinc-400">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-headline font-black text-zinc-900 tracking-tight ${item.unavailable ? 'line-through text-red-300' : ''}`}>₹{(item.price * item.quantity).toFixed(0)}</p>
                      {item.unavailable && !isRejected && <span className="text-[8px] font-black text-red-500">Out of Stock</span>}
                    </div>
                  </div>
                  {canReplace && (
                    <div className="bg-red-50 rounded-xl p-4 flex items-center justify-between border border-red-100">
                      <div>
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Item Unavailable</p>
                        <p className="text-[9px] font-bold text-red-500 mt-1">Replace within {minutesLeft}:{secondsLeft.toString().padStart(2, '0')} or it will be cancelled</p>
                      </div>
                      <button onClick={() => handleReplaceClick(idx, item.vendorId)} className="bg-white text-red-600 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm border border-red-200">Replace</button>
                    </div>
                  )}
                  {isRejected && timeRemaining <= 0 && (
                     <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200">
                       <p className="text-[9px] font-black text-zinc-500 text-center uppercase tracking-widest">Replacement window expired. Item cancelled.</p>
                     </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-8 border-t border-zinc-100 space-y-3">
             <div className="flex justify-between items-center opacity-60">
              <span className="text-[10px] font-black tracking-widest text-zinc-400">Items subtotal</span>
              <span className="text-xs font-bold font-headline text-zinc-900">₹{order.subtotal.toFixed(0)}</span>
            </div>
            {(order.total - order.subtotal - order.tax) > 0 && (
              <div className="flex justify-between items-center opacity-60">
                <span className="text-[10px] font-black tracking-widest text-zinc-400">Delivery & fees</span>
                <span className="text-xs font-bold font-headline text-zinc-900">₹{(order.total - order.subtotal - order.tax).toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between items-center opacity-60">
              <span className="text-[10px] font-black tracking-widest text-zinc-400">Tax</span>
              <span className="text-xs font-bold font-headline text-zinc-900">₹{order.tax.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] font-black tracking-widest text-zinc-900">
                {isDelivered ? 'Paid' : 'Pay'} via {order.paymentMethod || 'COD'}
              </span>
              <span className="text-xl font-headline font-black text-primary tracking-tighter">₹{order.total.toFixed(0)}</span>
            </div>
          </div>
          
          {/* Cancel Order Section */}
          {!isDelivered && order.status !== 'CANCELLED' && (
            <div className="mt-8 pt-8 border-t border-zinc-100">
              {order.status === 'PLACED' ? (
                <button 
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="w-full py-4 rounded-2xl bg-zinc-50 border border-zinc-100 text-red-500 font-black text-[10px] tracking-widest hover:bg-red-50 transition-all disabled:opacity-50"
                >
                  {cancelling ? 'CANCELLING...' : 'CANCEL ORDER'}
                </button>
              ) : (
                <button 
                  disabled
                  className="w-full py-4 rounded-2xl bg-zinc-100 text-zinc-400 font-black text-[10px] tracking-widest cursor-not-allowed opacity-50"
                >
                  CANCEL ORDER (DISABLED)
                </button>
              )}
              <p className="text-[9px] font-bold text-zinc-400 text-center mt-3 tracking-wide">
                * You can cancel only upto the rider gets assigned
              </p>
            </div>
          )}
        </div>


      </main>
      
      {order.items.some(i => i.unavailable && !i.replacedBy && i.vendorStatus !== "REJECTED") && (
        <div className="px-4 pb-8 max-w-2xl mx-auto">
          <div className="bg-red-50 rounded-[32px] p-8 border border-red-100 space-y-4">
            <div className="flex items-center gap-3 text-red-600 mb-2">
              <span className="material-symbols-outlined font-black">sentiment_dissatisfied</span>
              <h3 className="font-headline font-black text-xs tracking-widest">Stock update</h3>
            </div>
            <p className="text-[11px] font-bold text-red-800/60 leading-relaxed">
              Some items in your order were out of stock. We've adjusted your bill and refunded any excess payment.
            </p>
          </div>
        </div>
      )}

      {replacingItemIndex !== null && (
        <Portal>
          <div className="fixed inset-0 z-[200] flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReplacingItemIndex(null)}></div>
            <div className="bg-white w-full max-w-lg rounded-t-[40px] p-8 pb-safe shadow-2xl relative z-10 max-h-[80vh] flex flex-col">
               <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="text-2xl font-headline font-black text-zinc-900 tracking-tighter">Choose replacement</h3>
                   <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">From the same store</p>
                 </div>
                 <button onClick={() => setReplacingItemIndex(null)} className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500"><span className="material-symbols-outlined">close</span></button>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar -mr-4 pr-4 space-y-4">
                 {vendorProducts.length === 0 ? (
                    <div className="py-10 text-center opacity-50">
                      <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                      <p className="text-xs font-bold">No alternatives found from this store</p>
                    </div>
                 ) : (
                   vendorProducts.map(p => (
                     <div key={p.id} className="flex items-center gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                        <img src={p.image} alt="" className="w-16 h-16 object-contain bg-white rounded-xl" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-zinc-900 truncate">{p.name}</p>
                          <p className="text-[10px] font-bold text-zinc-500 mt-1">₹{p.price}</p>
                        </div>
                        <button onClick={() => handleReplace(p)} className="bg-primary text-zinc-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">Select</button>
                     </div>
                   ))
                 )}
               </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
