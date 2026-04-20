"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order, OrderStatus } from "@/types";
import { mapOrder } from "@/lib/mappers";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { triggerNotification } from "@/lib/notificationClient";

export default function RiderOrderDetail() {
 const { id } = useParams();
 const { user } = useAuth();
 const router = useRouter();
 const [order, setOrder] = useState<Order | null>(null);
 const [customerProfile, setCustomerProfile] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [deliveryCode, setDeliveryCode] = useState("");
 const [isVerifying, setIsVerifying] = useState(false);
 const [processing, setProcessing] = useState(false);


 useEffect(() => {
 if (!id) return;
 const unsub = onSnapshot(doc(db, "orders", id as string), async (snap) => {
 if (snap.exists()) {
 try {
 const mappedOrder = mapOrder(snap);
 setOrder(mappedOrder);
 if (mappedOrder.userId) {
 const { getDoc, doc } = await import("firebase/firestore");
 const userSnap = await getDoc(doc(db, "users", mappedOrder.userId));
 if (userSnap.exists()) {
 setCustomerProfile(userSnap.data());
 }
 }
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

 // Notify customer about status change
 triggerNotification({
 userId: order.userId,
 title: status === "PICKED"? "Order Shipped 🚚": (status === "ON_THE_WAY"? "Out for Delivery 🚀":`Order ${status}`),
 body: status === "PICKED"? "Your order has been picked up and is being prepared for delivery.": status === "ON_THE_WAY"? "Our rider is on the way to your location.":`Your order status has been updated to ${status}`,
 });

 } catch (error: any) {
 toast.error(error.message || "Update failed");
 } finally {
 setProcessing(false);
 }
 };

 const toggleItemAvailability = async (itemIndex: number) => {
 if (!order || processing) return;
 const item = order.items[itemIndex];
 const isNowUnavailable = !item.unavailable;

 setProcessing(true);
 const toastId = toast.loading(isNowUnavailable ? "Marking as unavailable...": "Marking as available...");

 try {
 const updatedItems = [...order.items];
 updatedItems[itemIndex] = { ...item, unavailable: isNowUnavailable };

 // 1. Calculate the new subtotal based ONLY on active items
 const activeItems = updatedItems.filter(i => !i.unavailable);
 const newSubtotal = activeItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
 // 2. Determine the original tax percentage
 // If subtotal is 0 now but wasn't before, we need the original ratio
 // order.subtotal and order.tax are from the current DB state (via onSnapshot)
 const taxPercent = order.subtotal > 0 ? (order.tax / order.subtotal) : 0.05; // Default to 5% if subtotal was 0
 const newTax = newSubtotal * taxPercent;
 // 3. Keep Delivery/Handling/SmallCart charges fixed
 // We calculate them once from the original order and keep them.
 // Crucially, if the subtotal drops, we don't ADD new small cart charges.
 const fixedCharges = order.total - order.subtotal - order.tax;
 const newTotal = newSubtotal + newTax + (fixedCharges > 0 ? fixedCharges : 0);

 const isAllUnavailable = activeItems.length === 0;

 await updateDoc(doc(db, "orders", order.id!), {
 items: updatedItems,
 subtotal: parseFloat(newSubtotal.toFixed(2)),
 tax: parseFloat(newTax.toFixed(2)),
 total: parseFloat(newTotal.toFixed(2)),
 status: isAllUnavailable ? "CANCELLED": order.status
 });

 if (isAllUnavailable) {
 triggerNotification({
 userId: order.userId,
 title: "Order Cancelled 🚫",
 body:`Unfortunately, all items in your order are out of stock. The order has been cancelled and any payment will be refunded.`,
 });
 toast.error("All items unavailable. Order cancelled.", { id: toastId });
 router.push("/rider");
 } else if (isNowUnavailable) {
 triggerNotification({
 userId: order.userId,
 title: "Order Updated 🛒",
 body:`Sorry, ${item.name} is out of stock. Order total adjusted to ₹${newTotal.toFixed(2)}.`,
 });
 toast.success(`${item.name} marked as unavailable`, { id: toastId });
 } else {
 toast.success(`${item.name} marked as available`, { id: toastId });
 }

 } catch (error: any) {
 toast.error(error.message || "Failed to update item", { id: toastId });
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
 await updateDoc(doc(db, "orders", order.id), { status: "DELIVERED"});
 toast.success("Job Completed! ⚡️", { id: toastId });
 // Notify customer
 triggerNotification({
 userId: order.userId,
 title: "Delivered 🎉",
 body: "Your order has been delivered successfully. Enjoy your products!",
 });

 router.push("/rider");
 } catch (error: any) {
 toast.error(error.message || "Error completing job", { id: toastId });
 }
 };

 const renderAddress = (addr: any) => {
 if (typeof addr === 'string') return addr;
 if (!addr) return "N/A";
 return`${addr.line1}${addr.line2 ?`, ${addr.line2}`: ''}, ${addr.city} - ${addr.pincode}${addr.landmark ?`(Landmark: ${addr.landmark})`: ''}`;
 };

 if (loading) return (
 <div className="flex items-center justify-center min-h-[60vh]">
 <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
 </div>
 );

 if (!order) return null;

 return (
  <div className="space-y-6 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
  <div className="flex items-center gap-4 mb-4">
  <button onClick={() => router.back()} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-100">
  <span className="material-symbols-outlined text-zinc-900">arrow_back</span>
  </button>
  <h2 className="text-xl font-headline font-black text-zinc-900 ">Job details</h2>
  </div>

  <section className="bg-zinc-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-[100px] pointer-events-none"></div>
  <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-6">
  <div>
  <p className="text-[10px] font-black text-primary mb-1">Order status</p>
  <h3 className="text-2xl font-headline font-black tracking-tight">{order.status.replace("_", " ")}</h3>
  </div>
  <div className="text-right">
  <p className="text-[10px] font-black text-zinc-500 mb-1">Grand total</p>
  <p className="text-2xl font-headline font-black text-primary">₹{order.total.toFixed(2)}</p>
  </div>
  </div>

  <div className="space-y-2 mb-6">
  <div className="flex justify-between items-center opacity-60">
  <span className="text-[9px] font-black">Subtotal</span>
  <span className="text-[11px] font-bold">₹{order.subtotal.toFixed(2)}</span>
  </div>
  <div className="flex justify-between items-center opacity-60">
  <span className="text-[9px] font-black">Taxes</span>
  <span className="text-[11px] font-bold">₹{order.tax.toFixed(2)}</span>
  </div>
  {(order.total - order.subtotal - order.tax) > 0 && (
  <div className="flex justify-between items-center opacity-60">
  <span className="text-[9px] font-black">Service & delivery</span>
  <span className="text-[11px] font-bold">₹{(order.total - order.subtotal - order.tax).toFixed(2)}</span>
  </div>
  )}
  </div>

  <div className="flex gap-2">
  <span className="text-[9px] font-black bg-white/10 px-2 py-1 rounded-lg ">{order.items.length} items</span>
  <span className="text-[9px] font-black bg-primary/20 text-primary px-2 py-1 rounded-lg ">{order.paymentMethod || 'COD'}</span>
  {order.deliverySlot && (
  <span className="text-[9px] font-black bg-orange-500/20 text-orange-400 px-2 py-1 rounded-lg flex items-center gap-1">
  <span className="material-symbols-outlined text-[10px]">schedule</span>
  {order.deliverySlot}
  </span>
  )}
  </div>
  </section>

  {/* Customer & Address */}
  <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100 space-y-4">
  <div className="flex items-center justify-between border-b border-zinc-50 pb-4">
  <div className="flex-1">
  <p className="text-[10px] font-black text-zinc-400 mb-1">Customer</p>
  <p className="font-headline font-black text-zinc-900 tracking-tight leading-tight">
  {customerProfile?.name || order.customerName || 'Customer'}
  </p>
  {(customerProfile?.phoneNumber || order.phoneNumber) && (
  <p className="text-[10px] font-bold text-zinc-400 tracking-wider mt-1">
  {customerProfile?.phoneNumber || order.phoneNumber}
  </p>
  )}
  </div>
  <div className="flex gap-2">
  {(customerProfile?.phoneNumber || order.phoneNumber) && (
  <a href={`tel:${customerProfile?.phoneNumber || order.phoneNumber}`} className="w-12 h-12 bg-primary text-zinc-900 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all"
  >
  <span className="material-symbols-outlined">call</span>
  </a>
  )}
  </div>
  </div>

  <div className="flex gap-3">
  <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center shrink-0">
  <span className="material-symbols-outlined text-zinc-400">location_on</span>
  </div>
  <div>
  <p className="text-[10px] font-black text-zinc-400 mb-1">Delivery address</p>
  <p className="text-sm font-bold text-zinc-700 leading-relaxed">{renderAddress(order.deliveryAddress)}</p>
  </div>
  </div>
  </section>

  <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100">
  <h3 className="text-[10px] font-black text-zinc-900 mb-4">Shipment checklist</h3>
  <div className="space-y-4">
  {order.items.map((item, idx) => (
  <div key={idx} className={`space-y-3 pb-4 border-b border-zinc-50 last:border-0 last:pb-0 p-4 rounded-3xl transition-all ${item.unavailable ? 'bg-red-50/50 border border-red-100 opacity-80': ''}`}>
  <div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10 bg-zinc-50 rounded-lg p-1 border border-zinc-100">
  <img src={item.image} alt=""className="w-full h-full object-contain"/>
  </div>
  <div>
  <p className={`text-[11px] font-black text-zinc-900 leading-tight ${item.unavailable ? 'line-through text-red-600': ''}`}>{item.name}</p>
  <p className="text-[9px] font-bold text-zinc-400">Quantity: {item.quantity}</p>
  </div>
  </div>
  <div className="text-right">
  <p className={`text-xs font-black text-zinc-900 ${item.unavailable ? 'line-through text-red-400': ''}`}>₹{(item.price * item.quantity).toFixed(0)}</p>
  {item.unavailable && <span className="text-[8px] font-black text-red-500 ">Out of Stock</span>}
  </div>
  </div>

  {/* Toggle Availability Button - only for rider during pick-up phase */}
  {(order.status === "ACCEPTED"|| order.status === "PICKED") && order.riderId === user?.uid && (
  <button onClick={() => toggleItemAvailability(idx)}
  disabled={processing}
  className={`w-full py-2 rounded-xl text-[9px] font-black transition-all ${
  item.unavailable ? "bg-white text-green-600 border border-green-200 shadow-sm": "bg-red-50 text-red-600 border border-red-100"
  }`}
  >
  {item.unavailable ? "Product found? (Add back)": "Mark not available"}
  </button>
  )}
  </div>
  ))}
  </div>
  </section>

  {/* Action Buttons */}
  <div className="fixed bottom-0 left-0 w-full p-6 bg-white/90 backdrop-blur-2xl border-t border-zinc-100/50 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
  <div className="max-w-3xl mx-auto">
  {order.status === "PLACED"&& (
  <button onClick={() => updateOrderStatus("ACCEPTED", true)}
  disabled={processing}
  className="w-full h-14 bg-zinc-900 text-white rounded-2xl font-headline font-black text-xs shadow-xl active:scale-95 transition-all"
  >
  {processing ? "Accepting...": "Accept job ⚡️"}
  </button>
  )}

  {order.status === "ACCEPTED"&& order.riderId === user?.uid && (
  <button onClick={() => updateOrderStatus("PICKED")}
  disabled={processing}
  className="w-full h-14 bg-primary text-zinc-900 rounded-2xl font-headline font-black text-xs shadow-xl active:scale-95 transition-all"
  >
  {processing ? "Updating...": "I have the shipment 📦"}
  </button>
  )}

  {order.status === "PICKED"&& order.riderId === user?.uid && (
  <button onClick={() => updateOrderStatus("ON_THE_WAY")}
  disabled={processing}
  className="w-full h-14 bg-zinc-900 text-white rounded-2xl font-headline font-black text-xs shadow-xl active:scale-95 transition-all"
  >
  Initiate dispatch 🚀
  </button>
  )}

  {order.status === "ON_THE_WAY"&& order.riderId === user?.uid && (
  <div className="space-y-4">
  {isVerifying ? (
  <div className="bg-zinc-950 rounded-3xl p-6 space-y-4 animate-in slide-in-from-bottom-4">
  <p className="text-[10px] font-black text-zinc-500 text-center">Enter customer PIN</p>
  <div className="flex gap-3">
  <input type="number"placeholder="0000"
  className="w-full bg-white/10 border-none rounded-2xl p-4 text-center font-headline font-black text-3xl text-white outline-none ring-2 ring-primary/20 focus:ring-primary transition-all"
  value={deliveryCode}
  onChange={e => setDeliveryCode(e.target.value.substring(0,4))}
  />
  <button onClick={handleVerifySubmission}
  className="w-16 h-16 bg-primary text-zinc-900 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
  >
  <span className="material-symbols-outlined font-black">check</span>
  </button>
  </div>
  <button onClick={() => setIsVerifying(false)} className="w-full text-[10px] font-black text-zinc-500 py-2">Cancel</button>
  </div>
  ) : (
  <button onClick={() => setIsVerifying(true)}
  className="w-full h-14 bg-primary text-zinc-900 rounded-2xl font-headline font-black text-xs shadow-xl active:scale-95 transition-all"
  >
  Arrived at destination 📍
  </button>
  )}
  </div>
  )}
  </div>
  </div>
  </div>
 );
}
