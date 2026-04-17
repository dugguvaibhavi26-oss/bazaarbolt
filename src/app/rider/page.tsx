"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order, OrderStatus } from "@/types";
import toast from "react-hot-toast";
import { mapOrder, mapQuerySnapshot } from "@/lib/mappers";

export default function RiderApp() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliveryCode, setDeliveryCode] = useState("");
  const [activeCodeOrderId, setActiveCodeOrderId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      try {
        const allOrds = mapQuerySnapshot(snap, mapOrder);
        const ords = allOrds.filter(data => 
          data.status === "PLACED" || (data.riderId === user?.uid && data.status !== "DELIVERED")
        );
        
        ords.sort((a, b) => {
          if (a.riderId === user?.uid && b.riderId !== user?.uid) return -1;
          if (a.riderId !== user?.uid && b.riderId === user?.uid) return 1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

        setOrders(ords);
      } catch (e) {
        console.error("Mapping error in RiderApp:", e);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const updateOrderStatus = async (orderId: string, status: OrderStatus, assignRider = false) => {
    if (!user || processingId) return;
    setProcessingId(orderId);
    try {
      const updatePayload: Partial<Order> = { status };
      if (assignRider) updatePayload.riderId = user.uid;
      await updateDoc(doc(db, "orders", orderId), updatePayload);
      toast.success(`Action: ${status}`);
    } catch (error: unknown) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Operation failed";
      toast.error(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerifySubmission = async (order: Order) => {
    if (!order.id) return;
    if (deliveryCode !== order.deliveryCode) {
      toast.error("Incorrect Verification PIN");
      return;
    }
    const toastId = toast.loading("Finalizing delivery...");
    try {
      await updateDoc(doc(db, "orders", order.id), { status: "DELIVERED" });
      toast.success("Job Completed! ⚡️", { id: toastId });
      setActiveCodeOrderId(null);
      setDeliveryCode("");
    } catch (error: unknown) {
      console.error("Checkout error:", error);
      const errorMessage = error instanceof Error ? error.message : "Error completing job";
      toast.error(errorMessage, { id: toastId });
    }
  };

  if (loading) return (
     <div className="space-y-6 pt-10">
        <div className="h-64 bg-white rounded-[40px] animate-pulse" />
        <div className="h-64 bg-white rounded-[40px] animate-pulse" />
     </div>
  );

  const renderAddress = (addr: any) => {
    if (typeof addr === 'string') return addr;
    if (!addr) return "N/A";
    return `${addr.line1}${addr.line2 ? `, ${addr.line2}` : ''}, ${addr.city} - ${addr.pincode}${addr.landmark ? ` (Landmark: ${addr.landmark})` : ''}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
       <div className="flex items-end justify-between px-2">
          <div>
             <h2 className="text-3xl font-headline font-black text-zinc-900 tracking-tight italic">Pulse Feed</h2>
             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{orders.length} ACTIVE JOBS</p>
          </div>
          <div className="flex items-center gap-2 bg-green-50 text-green-600 px-3 py-1.5 rounded-xl border border-green-100">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
             <span className="text-[10px] font-black uppercase tracking-widest leading-none">Scanning</span>
          </div>
       </div>

       <div className="space-y-6">
          {orders.length === 0 ? (
             <div className="py-20 bg-white rounded-[40px] border border-dashed border-zinc-200 flex flex-col items-center">
                <span className="material-symbols-outlined text-6xl text-zinc-100 mb-4" style={{fontVariationSettings: "'FILL' 1"}}>speed</span>
                <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px]">No orders available right now</p>
             </div>
          ) : (
             orders.map(order => (
                <div key={order.id} className={`bg-white rounded-[40px] p-8 shadow-sm border border-zinc-100 relative overflow-hidden group transition-all hover:shadow-xl ${order.riderId === user?.uid ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                   
                   {order.riderId === user?.uid && (
                      <div className="absolute top-0 right-0 bg-primary text-zinc-900 px-6 py-2 rounded-bl-[24px] font-black text-[10px] uppercase tracking-widest shadow-sm">Assigned To You</div>
                   )}

                   <div className="flex justify-between items-start mb-8">
                      <div>
                         <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">Rapid Order ID</span>
                         <h3 className="font-headline font-black text-xl text-zinc-900 tracking-tighter uppercase leading-none">#{order.id?.slice(-8).toUpperCase()}</h3>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="font-headline font-black text-2xl text-zinc-900 tracking-tighter leading-none inline-flex items-baseline">
                            ₹{order.total.toFixed(0)}
                         </span>
                         <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded mt-2">{order.items.length} ITEMS • {order.paymentMethod || 'COD'}</span>
                      </div>
                   </div>

                   <div className="bg-zinc-50 rounded-[28px] p-6 border border-zinc-100 flex items-start gap-5">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-zinc-400 group-hover:text-primary transition-colors shrink-0 shadow-sm">
                         <span className="material-symbols-outlined font-black">location_on</span>
                      </div>
                      <div>
                         <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 block">Delivery Drop</span>
                         <p className="text-sm font-bold text-zinc-700 leading-relaxed font-headline">{renderAddress(order.deliveryAddress)}</p>
                      </div>
                   </div>

                   {/* Items List - Collapsible */}
                   <div className="mt-4 mb-8 px-2">
                      <button 
                        onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                         <span className="text-[10px] font-black uppercase tracking-widest">
                           {expandedId === order.id ? 'Hide Items' : `View ${order.items.length} Items`}
                         </span>
                         <span className={`material-symbols-outlined text-sm font-bold transition-transform ${expandedId === order.id ? 'rotate-180' : ''}`}>expand_more</span>
                      </button>

                      {expandedId === order.id && (
                         <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            {order.items.map((item, idx) => (
                               <div key={idx} className="flex items-center justify-between bg-zinc-50/50 p-3 rounded-2xl border border-zinc-100">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 bg-white rounded-lg p-1 border border-zinc-100">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                     </div>
                                     <div>
                                        <p className="text-[11px] font-black text-zinc-900 leading-tight">{item.name}</p>
                                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Qty: {item.quantity}</p>
                                     </div>
                                  </div>
                                  <span className="text-xs font-black text-zinc-900">₹{(item.price * item.quantity).toFixed(0)}</span>
                               </div>
                            ))}
                         </div>
                      )}
                   </div>

                   <div className="pt-2">
                      {order.status === "PLACED" && (
                         <button 
                           onClick={() => updateOrderStatus(order.id!, "ACCEPTED", true)}
                           disabled={processingId === order.id}
                           className="w-full h-16 bg-zinc-900 text-white rounded-2xl font-headline font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-zinc-900/10"
                         >
                           {processingId === order.id ? "SYCHRONIZING..." : "Accept Job"}
                           <span className="material-symbols-outlined text-lg">bolt</span>
                         </button>
                      )}

                      {order.status === "ACCEPTED" && order.riderId === user?.uid && (
                         <button 
                           onClick={() => updateOrderStatus(order.id!, "PICKED")}
                           disabled={processingId === order.id}
                           className="w-full h-16 bg-primary text-zinc-900 rounded-2xl font-headline font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-primary/20"
                         >
                           <span className="material-symbols-outlined">inventory_2</span>
                           {processingId === order.id ? "CHECKING..." : "I've Received the Shipment"}
                         </button>
                      )}

                      {order.status === "PICKED" && order.riderId === user?.uid && (
                         <button 
                           onClick={() => updateOrderStatus(order.id!, "ON_THE_WAY")}
                           className="w-full h-16 bg-zinc-900 text-white rounded-2xl font-headline font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-zinc-900/10 group"
                         >
                           <span className="material-symbols-outlined group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">send</span>
                           Initiate Dispatch
                         </button>
                      )}

                      {order.status === "ON_THE_WAY" && order.riderId === user?.uid && (
                         <div className="space-y-4">
                            {activeCodeOrderId === order.id ? (
                               <div className="bg-zinc-950 rounded-[32px] p-8 space-y-6 animate-in slide-in-from-top-4 duration-300">
                                  <div className="text-center">
                                     <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ask customer for Secure PIN</span>
                                  </div>
                                  <div className="flex gap-4">
                                     <input 
                                       type="number" 
                                       placeholder="0000"
                                       className="w-full bg-white/10 border-none rounded-2xl p-5 text-center font-headline font-black text-3xl text-white tracking-[0.5em] outline-none ring-2 ring-primary/20 focus:ring-primary transition-all"
                                       value={deliveryCode}
                                       onChange={e => setDeliveryCode(e.target.value.substring(0,4))}
                                     />
                                     <button 
                                       onClick={() => handleVerifySubmission(order)}
                                       className="w-16 h-16 bg-primary text-zinc-900 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                                     >
                                        <span className="material-symbols-outlined font-black">check</span>
                                     </button>
                                  </div>
                                  <button onClick={() => setActiveCodeOrderId(null)} className="w-full text-[9px] font-black text-zinc-600 uppercase tracking-widest text-center hover:text-zinc-400">Back</button>
                               </div>
                            ) : (
                               <button 
                                 onClick={() => {setActiveCodeOrderId(order.id!); setDeliveryCode("");}}
                                 className="w-full h-16 bg-primary text-zinc-900 rounded-2xl font-headline font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-primary/20"
                               >
                                 <span className="material-symbols-outlined">how_to_reg</span>
                                 Arrived • Verify & Drop
                               </button>
                            )}
                         </div>
                      )}
                   </div>
                </div>
             ))
          )}
       </div>
    </div>
  );
}
