"use client";

import { use, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types";
import { useRouter } from "next/navigation";
import { mapOrder } from "@/lib/mappers";
import { AdUnit } from "@/components/AdUnit";

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

        // Return items to stock
        for (const item of order.items) {
          const prodRef = doc(db, "products", item.id);
          const prodSnap = await transaction.get(prodRef);
          if (prodSnap.exists()) {
            transaction.update(prodRef, { stock: prodSnap.data().stock + item.quantity });
          }
        }

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

  const statusInfo = getStatusDisplay();
  const isDelivered = order.status.toUpperCase() === "DELIVERED";

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] border-b border-zinc-100">
        <div className="flex items-center justify-between px-4 py-4 w-full max-w-2xl mx-auto">
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

      <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-6 text-[#1A1A1A]">
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
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 group">
                <div className="w-16 h-16 bg-zinc-50 rounded-2xl p-2 border border-zinc-100 shrink-0">
                  <img src={item.image} alt="" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-black text-zinc-900 leading-tight mb-1 truncate ${item.unavailable ? 'line-through text-red-500' : ''}`}>{item.name}</p>
                  <p className="text-[10px] font-bold text-zinc-400">Qty: {item.quantity}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-headline font-black text-zinc-900 tracking-tight ${item.unavailable ? 'line-through text-red-300' : ''}`}>₹{(item.price * item.quantity).toFixed(0)}</p>
                  {item.unavailable && <span className="text-[8px] font-black text-red-500">Out of Stock</span>}
                </div>
              </div>
            ))}
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

        <section className="mt-8">
          <AdUnit slotId="order-detail-bottom" className="m-0" />
        </section>
      </main>
      
      {order.items.some(i => i.unavailable) && (
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
    </>
  );
}
