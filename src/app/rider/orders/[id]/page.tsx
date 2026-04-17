"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order, OrderStatus } from "@/types";
import { mapOrder } from "@/lib/mappers";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";

export default function RiderOrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryCode, setDeliveryCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "orders", id as string), (snap) => {
      if (snap.exists()) {
        try {
          setOrder(mapOrder(snap));
        } catch (e) {
          console.error(e);
          toast.error("Failed to parse order data");
        }
      } else {
        toast.error("Order not found");
        router.push("/rider");
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id, router]);

  const updateOrderStatus = async (status: OrderStatus, assignRider = false) => {
    if (!order || processing) return;
    setProcessing(true);
    try {
      const updatePayload: Partial<Order> = { status };
      if (assignRider && user) updatePayload.riderId = user.uid;
      await updateDoc(doc(db, "orders", order.id!), updatePayload);
      toast.success(`Order ${status}`);
    } catch (error: any) {
      toast.error(error.message || "Update failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifySubmission = async () => {
    if (!order || !order.id) return;
    if (deliveryCode !== order.deliveryCode) {
      toast.error("Incorrect Verification PIN");
      return;
    }
    const toastId = toast.loading("Finalizing delivery...");
    try {
      await updateDoc(doc(db, "orders", order.id), { status: "DELIVERED" });
      toast.success("Job Completed! ⚡️", { id: toastId });
      router.push("/rider");
    } catch (error: any) {
      toast.error(error.message || "Error completing job", { id: toastId });
    }
  };

  const renderAddress = (addr: any) => {
    if (typeof addr === 'string') return addr;
    if (!addr) return "N/A";
    return `${addr.line1}${addr.line2 ? `, ${addr.line2}` : ''}, ${addr.city} - ${addr.pincode}${addr.landmark ? ` (Landmark: ${addr.landmark})` : ''}`;
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!order) return null;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => router.back()} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-100">
          <span className="material-symbols-outlined text-zinc-900">arrow_back</span>
        </button>
        <h2 className="text-xl font-headline font-black text-zinc-900 uppercase">Job Details</h2>
      </div>

      {/* Main Status Header */}
      <section className="bg-zinc-900 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Order Status</p>
            <h3 className="text-2xl font-headline font-black uppercase tracking-tight">{order.status.replace("_", " ")}</h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Grand Total</p>
            <p className="text-2xl font-headline font-black">₹{order.total.toFixed(0)}</p>
          </div>
        </div>
        <div className="flex gap-2">
           <span className="text-[9px] font-black bg-white/10 px-2 py-1 rounded-lg uppercase">{order.items.length} Items</span>
           <span className="text-[9px] font-black bg-primary/20 text-primary px-2 py-1 rounded-lg uppercase">{order.paymentMethod || 'COD'}</span>
        </div>
      </section>

      {/* Customer & Address */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-50 pb-4">
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Customer</p>
            <p className="font-headline font-black text-zinc-900 uppercase">{order.customerName || 'Customer'}</p>
          </div>
          {order.phoneNumber && (
            <a href={`tel:${order.phoneNumber}`} className="w-12 h-12 bg-primary text-zinc-900 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all">
              <span className="material-symbols-outlined">call</span>
            </a>
          )}
        </div>
        
        <div className="flex gap-3">
          <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-zinc-400">location_on</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Delivery Address</p>
            <p className="text-sm font-bold text-zinc-700 leading-relaxed">{renderAddress(order.deliveryAddress)}</p>
          </div>
        </div>
      </section>

      {/* Items List */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100">
        <h3 className="text-[10px] font-black text-zinc-900 uppercase tracking-widest mb-4">Shipment Checklist</h3>
        <div className="space-y-3">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-50 rounded-lg p-1 border border-zinc-100">
                  <img src={item.image} alt="" className="w-full h-full object-contain" />
                </div>
                <div>
                  <p className="text-[11px] font-black text-zinc-900 leading-tight">{item.name}</p>
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Quantity: {item.quantity}</p>
                </div>
              </div>
              <p className="text-xs font-black text-zinc-900">₹{(item.price * item.quantity).toFixed(0)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-white/90 backdrop-blur-2xl border-t border-zinc-100/50 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto">
          {order.status === "PLACED" && (
            <button 
              onClick={() => updateOrderStatus("ACCEPTED", true)}
              disabled={processing}
              className="w-full h-14 bg-zinc-900 text-white rounded-2xl font-headline font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              {processing ? "Accepting..." : "Accept Job ⚡️"}
            </button>
          )}

          {order.status === "ACCEPTED" && order.riderId === user?.uid && (
            <button 
              onClick={() => updateOrderStatus("PICKED")}
              disabled={processing}
              className="w-full h-14 bg-primary text-zinc-900 rounded-2xl font-headline font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              {processing ? "Updating..." : "I have the shipment 📦"}
            </button>
          )}

          {order.status === "PICKED" && order.riderId === user?.uid && (
            <button 
              onClick={() => updateOrderStatus("ON_THE_WAY")}
              disabled={processing}
              className="w-full h-14 bg-zinc-900 text-white rounded-2xl font-headline font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              Initiate Dispatch 🚀
            </button>
          )}

          {order.status === "ON_THE_WAY" && order.riderId === user?.uid && (
            <div className="space-y-4">
              {isVerifying ? (
                <div className="bg-zinc-950 rounded-3xl p-6 space-y-4 animate-in slide-in-from-bottom-4">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Enter Customer PIN</p>
                  <div className="flex gap-3">
                    <input 
                      type="number" 
                      placeholder="0000"
                      className="w-full bg-white/10 border-none rounded-2xl p-4 text-center font-headline font-black text-3xl text-white outline-none ring-2 ring-primary/20 focus:ring-primary transition-all"
                      value={deliveryCode}
                      onChange={e => setDeliveryCode(e.target.value.substring(0,4))}
                    />
                    <button 
                      onClick={handleVerifySubmission}
                      className="w-16 h-16 bg-primary text-zinc-900 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
                    >
                      <span className="material-symbols-outlined font-black">check</span>
                    </button>
                  </div>
                  <button onClick={() => setIsVerifying(false)} className="w-full text-[10px] font-black text-zinc-500 uppercase tracking-widest py-2">Cancel</button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsVerifying(true)}
                  className="w-full h-14 bg-primary text-zinc-900 rounded-2xl font-headline font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                >
                  Arrived At Destination 📍
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
