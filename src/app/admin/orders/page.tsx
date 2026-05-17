"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, where, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import toast from "react-hot-toast";
import { Order, OrderStatus } from "@/types";
import { mapOrder, mapQuerySnapshot } from "@/lib/mappers";
import { useStore } from "@/store/useStore";
import { Portal } from "@/components/Portal";

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [riders, setRiders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { settings } = useStore();

  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      try {
        const ords = mapQuerySnapshot(snap, mapOrder);
        setOrders(ords);
      } catch (e) {
        console.error("Mapping error in AdminOrders:", e);
        toast.error("Data corruption detected in orders");
      }
      setLoading(false);
    });

    const ridersQuery = query(collection(db, "users"), where("role", "==", "rider"));
    const unsubRiders = onSnapshot(ridersQuery, (snap) => {
      setRiders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsub();
      unsubRiders();
    };
  }, []);

  // Update selectedOrder details in real-time when orders list updates from Firestore
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find(o => o.id === selectedOrder.id);
      if (updated) {
        setSelectedOrder(updated);
      }
    }
  }, [orders]);

  const updateStatus = async (order: Order, newStatus: string) => {
    try {
      const { triggerNotification } = await import("@/lib/notificationClient");
      const payload: any = { status: newStatus };
      if (newStatus === "CANCELLED") {
        payload.riderId = null;
      }
      await updateDoc(doc(db, "orders", order.id!), payload);
      toast.success(`Order updated to ${newStatus}`);
      
      let title = `Order ${newStatus}`;
      let body = `Your order status has been updated to ${newStatus}.`;

      if (settings?.notificationTemplates?.[newStatus]) {
        const template = settings.notificationTemplates[newStatus];
        title = template.title;
        body = template.body.replace("{{name}}", order.customerName || "Customer");
      }
      
      triggerNotification({ 
        userId: order.userId, 
        title, 
        body,
        data: { url: "/orders" }
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  };

  const assignRider = async (order: Order, riderId: string) => {
    try {
      const { triggerNotification } = await import("@/lib/notificationClient");
      const rId = riderId === "unassigned" ? null : riderId;
      await updateDoc(doc(db, "orders", order.id!), { riderId: rId });
      toast.success(rId ? "Rider assigned successfully" : "Rider unassigned");

      if (rId) {
        const riderObj = riders.find(r => r.id === rId);
        triggerNotification({
          userId: order.userId,
          title: "Rider Assigned 🛵",
          body: `Hi, ${riderObj?.name || 'A rider'} is assigned to deliver your order in the selected slot.`
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to assign rider");
    }
  };

  const handleEditItemQuantity = async (order: Order, itemIndex: number, newQty: number) => {
    if (newQty < 1) return;
    try {
      const updatedItems = [...order.items];
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], quantity: newQty };
      await recalculateAndSaveOrder(order, updatedItems);
    } catch (e: any) {
      toast.error("Failed to update item quantity");
    }
  };

  const handleToggleItemAvailability = async (order: Order, itemIndex: number) => {
    try {
      const updatedItems = [...order.items];
      const item = updatedItems[itemIndex];
      const isNowUnavailable = !item.unavailable;
      
      updatedItems[itemIndex] = {
        ...item,
        unavailable: isNowUnavailable,
        vendorStatus: isNowUnavailable ? "REJECTED" : "ACCEPTED"
      };

      await recalculateAndSaveOrder(order, updatedItems);
    } catch (e: any) {
      toast.error("Failed to toggle item availability");
    }
  };

  const recalculateAndSaveOrder = async (order: Order, updatedItems: any[]) => {
    const activeItems = updatedItems.filter(i => !i.unavailable);
    const newSubtotal = activeItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    const taxPercent = order.subtotal > 0 ? (order.tax / order.subtotal) : 0.05;
    const newTax = newSubtotal * taxPercent;
    const fixedCharges = order.total - order.subtotal - order.tax;
    const newTotal = newSubtotal + newTax + (fixedCharges > 0 ? fixedCharges : 0);

    const isAllUnavailable = activeItems.length === 0;
    const sanitizedItems = JSON.parse(JSON.stringify(updatedItems, (k, v) => v === undefined ? null : v));

    const payload: any = {
      items: sanitizedItems,
      subtotal: parseFloat(newSubtotal.toFixed(2)),
      tax: parseFloat(newTax.toFixed(2)),
      total: parseFloat(newTotal.toFixed(2))
    };

    if (isAllUnavailable) {
      payload.status = "CANCELLED";
      payload.riderId = null;
    }

    await updateDoc(doc(db, "orders", order.id!), payload);
    toast.success("Order recalculated and saved!");
  };

  const filteredOrders = filter === "ALL" ? orders : orders.filter(o => o.status === filter);

  const renderAddress = (addr: any) => {
    if (typeof addr === 'string') return addr;
    if (!addr) return "N/A";
    return `${addr.line1}${addr.line2 ? `, ${addr.line2}` : ''}, ${addr.city} - ${addr.pincode}${addr.landmark ? ` (Landmark: ${addr.landmark})` : ''}`;
  };

  if (loading) return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-12 bg-white rounded-2xl w-1/3"/>
      <div className="h-64 bg-white rounded-3xl"/>
    </div>
  );

  return (
    <div className="space-y-6 lg:space-y-8 pb-32">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl lg:text-2xl font-black text-zinc-900 tracking-tight">Active Orders</h3>
          <p className="text-[10px] lg:text-xs font-bold text-zinc-400 tracking-widest mt-1 uppercase">Order lifecycle management</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-zinc-200 shadow-sm overflow-x-auto hide-scrollbar max-w-full">
          {["ALL", "PLACED", "ACCEPTED", "PICKED", "DELIVERED", "CANCELLED"].map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-primary text-zinc-900 shadow-sm': 'text-zinc-500 hover:text-zinc-900'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {filteredOrders.map(o => (
          <div key={o.id} className="bg-white rounded-[24px] p-5 border border-zinc-100 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
                <div>
                  <p className="font-headline font-black text-[11px] text-zinc-900 tracking-tight">#{o.id!.slice(-8).toUpperCase()}</p>
                  <p className="text-[10px] font-bold text-zinc-400">{o.customerName || "Customer"}</p>
                </div>
              </div>
              <div className="text-right flex flex-col gap-1">
                <span className="font-headline font-black text-sm text-zinc-900">₹{o.total.toFixed(0)}</span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase ${
                  o.status === 'DELIVERED' ? 'bg-green-50 text-green-600' :
                  o.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                  'bg-blue-50 text-blue-600'
                }`}>{o.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-50 pt-4">
              <div className="flex -space-x-2">
                {o.items.slice(0, 3).map((item: any, i: number) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-zinc-100 p-1">
                    <img src={item.image} alt="" className="w-full h-full object-contain" />
                  </div>
                ))}
                {o.items.length > 3 && (
                  <div className="w-7 h-7 rounded-full border-2 border-white bg-zinc-900 text-white text-[7px] font-black flex items-center justify-center">
                    +{o.items.length - 3}
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setSelectedOrder(o)}
                className="px-4 py-2 bg-zinc-900 hover:bg-black text-white text-[9px] font-black tracking-widest rounded-xl transition-all shadow-md active:scale-95"
              >
                VIEW & EDIT
              </button>
            </div>
          </div>
        ))}
        {filteredOrders.length === 0 && (
          <div className="p-12 text-center bg-white rounded-[24px] border border-dashed border-zinc-200">
            <span className="material-symbols-outlined text-4xl text-zinc-200 mb-2">inventory_2</span>
            <p className="text-[9px] font-black tracking-widest text-zinc-400">No orders found</p>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-[40px] shadow-sm border border-zinc-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 text-zinc-400">
                <th className="px-8 py-5 text-[10px] font-black tracking-widest">Order / Customer</th>
                <th className="px-8 py-5 text-[10px] font-black tracking-widest">Items & Bag</th>
                <th className="px-8 py-5 text-[10px] font-black tracking-widest">Pricing</th>
                <th className="px-8 py-5 text-[10px] font-black tracking-widest text-center">Lifecycle Status</th>
                <th className="px-8 py-5 text-[10px] font-black tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredOrders.map(o => (
                <tr key={o.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">person</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline font-black text-xs text-zinc-900 tracking-tighter">#{o.id!.slice(-8).toUpperCase()}</span>
                        <span className="text-[10px] font-bold text-zinc-500">{o.customerName || o.userId.slice(0,10)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex -space-x-3 overflow-hidden">
                      {o.items.slice(0, 3).map((item: any, i: number) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-zinc-100 p-1 flex items-center justify-center shadow-sm">
                          <img src={item.image} alt=""className="w-full h-full object-contain"/>
                        </div>
                      ))}
                      {o.items.length > 3 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-zinc-900 text-white text-[8px] font-black flex items-center justify-center shadow-sm">
                          +{o.items.length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="font-headline font-black text-sm text-zinc-900 tracking-tight">₹{o.total.toFixed(2)}</span>
                    <p className="text-[9px] font-bold text-zinc-400 mt-1 tracking-widest">{o.paymentMethod || 'COD'}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center">
                      <select 
                        value={o.status}
                        onChange={(e) => updateStatus(o, e.target.value)}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black tracking-widest shadow-sm border-none cursor-pointer
                        ${o.status === 'DELIVERED'? 'bg-green-100 text-green-700': o.status === 'PICKED'? 'bg-orange-100 text-orange-700': o.status === 'CANCELLED'? 'bg-red-100 text-red-700':
                        'bg-blue-100 text-blue-700'}`}
                      >
                        {["PLACED", "ACCEPTED", "PICKED", "ON_THE_WAY", "DELIVERED", "CANCELLED"].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => setSelectedOrder(o)}
                      className="p-3 bg-zinc-50 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all"
                      title="View & Edit Details"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <div className="p-20 text-center">
              <span className="material-symbols-outlined text-5xl text-zinc-200 mb-4">move_to_inbox</span>
              <p className="text-[10px] font-black tracking-widest text-zinc-400">No Orders in this queue</p>
            </div>
          )}
        </div>
      </div>

      {/* Admin Order Details & Edit Modal Drawer */}
      {selectedOrder && (
        <Portal>
          <div className="fixed inset-0 z-[100] bg-zinc-950/60 backdrop-blur-md flex justify-end animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={() => setSelectedOrder(null)} />
            <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col relative z-10 animate-in slide-in-from-right duration-500">
              
              {/* Header */}
              <div className="px-6 py-6 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-headline font-black text-zinc-900 tracking-tight leading-none">Order Details</h3>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1.5">ID: #{selectedOrder.id!.toUpperCase()}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)} 
                  className="w-10 h-10 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center text-zinc-500 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                
                {/* Status & Rider Control Card */}
                <div className="bg-zinc-900 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-[100px] pointer-events-none"></div>
                  
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="text-[9px] font-black text-primary tracking-widest uppercase block mb-1">Order Status</label>
                      <select 
                        value={selectedOrder.status}
                        onChange={(e) => updateStatus(selectedOrder, e.target.value)}
                        className="bg-white/10 hover:bg-white/20 border-none rounded-xl text-xs font-black tracking-widest uppercase text-white cursor-pointer px-4 py-2.5 outline-none transition-colors w-full"
                      >
                        {["PLACED", "ACCEPTED", "PICKED", "ON_THE_WAY", "DELIVERED", "CANCELLED"].map(s => (
                          <option key={s} value={s} className="bg-zinc-900 text-white">{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-zinc-400 tracking-widest uppercase block mb-1">Assign Rider</label>
                      <select 
                        value={selectedOrder.riderId || "unassigned"}
                        onChange={(e) => assignRider(selectedOrder, e.target.value)}
                        className="bg-white/10 hover:bg-white/20 border-none rounded-xl text-xs font-black tracking-widest uppercase text-white cursor-pointer px-4 py-2.5 outline-none transition-colors w-full"
                      >
                        <option value="unassigned" className="bg-zinc-900 text-white">Unassigned</option>
                        {riders.map(r => (
                          <option key={r.id} value={r.id} className="bg-zinc-900 text-white">
                            {r.name || 'Rider'} ({r.phoneNumber || 'No phone'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-between items-center border-t border-white/10 pt-4">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Grand Total:</span>
                    <span className="text-2xl font-headline font-black text-primary">₹{selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Customer Details Card */}
                <div className="bg-zinc-50 border border-zinc-100 rounded-[28px] p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-200/50 pb-3">
                    <div>
                      <p className="text-[9px] font-black text-zinc-400 tracking-widest uppercase">Customer</p>
                      <h4 className="font-headline font-black text-sm text-zinc-900 mt-0.5">{selectedOrder.customerName || "Customer"}</h4>
                    </div>
                    {selectedOrder.phoneNumber && (
                      <a href={`tel:${selectedOrder.phoneNumber}`} className="w-10 h-10 bg-primary text-zinc-900 rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-base">call</span>
                      </a>
                    )}
                  </div>

                  <div>
                    <p className="text-[9px] font-black text-zinc-400 tracking-widest uppercase">Delivery Address</p>
                    <p className="text-xs font-bold text-zinc-700 leading-relaxed mt-1">{renderAddress(selectedOrder.deliveryAddress)}</p>
                  </div>

                  {selectedOrder.deliverySlot && (
                    <div className="grid grid-cols-2 gap-4 border-t border-zinc-200/50 pt-3">
                      <div>
                        <p className="text-[9px] font-black text-zinc-400 tracking-widest uppercase">Slot Time</p>
                        <p className="text-xs font-black text-zinc-900 mt-1 uppercase">{selectedOrder.deliverySlot}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-zinc-400 tracking-widest uppercase">Delivery Date</p>
                        <p className="text-xs font-black text-zinc-900 mt-1">{selectedOrder.deliveryDate || 'N/A'}</p>
                      </div>
                    </div>
                  )}

                  {!["DELIVERED", "CANCELLED"].includes(selectedOrder.status) && (
                    <div className="flex justify-between items-center border-t border-zinc-200/50 pt-3">
                      <span className="text-[9px] font-black text-zinc-400 tracking-widest uppercase">Delivery PIN</span>
                      <span className="text-xl font-headline font-black text-zinc-900 tracking-widest">{selectedOrder.deliveryCode}</span>
                    </div>
                  )}
                </div>

                {/* Items Checklist and Edit */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-zinc-900 tracking-widest uppercase px-1">Order Checklist & Breakdown</h4>
                  
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={`bg-white border rounded-2xl p-4 transition-all flex flex-col gap-3 ${
                          item.unavailable ? 'border-red-100 bg-red-50/20 opacity-70' : 'border-zinc-100 hover:border-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 rounded-xl p-1 shrink-0 flex items-center justify-center">
                              <img src={item.image} alt="" className="w-full h-full object-contain" />
                            </div>
                            <div>
                              <p className={`text-[11px] font-black text-zinc-900 leading-tight ${item.unavailable ? 'line-through text-red-500' : ''}`}>{item.name}</p>
                              <p className="text-[10px] font-bold text-zinc-400 mt-0.5">₹{item.price} each</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-xs font-black text-zinc-900 ${item.unavailable ? 'line-through text-red-300' : ''}`}>
                              ₹{(item.price * item.quantity).toFixed(0)}
                            </p>
                            {item.unavailable && <span className="text-[8px] font-black text-red-500 uppercase tracking-wide">Out of stock</span>}
                          </div>
                        </div>

                        {/* Interactive Edit Toolbar */}
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleEditItemQuantity(selectedOrder, idx, item.quantity - 1)}
                              disabled={item.unavailable || item.quantity <= 1}
                              className="w-7 h-7 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 disabled:hover:bg-zinc-100 rounded-lg flex items-center justify-center font-bold text-xs"
                            >
                              -
                            </button>
                            <span className="w-6 text-center text-xs font-headline font-black text-zinc-900">{item.quantity}</span>
                            <button 
                              onClick={() => handleEditItemQuantity(selectedOrder, idx, item.quantity + 1)}
                              disabled={item.unavailable}
                              className="w-7 h-7 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 rounded-lg flex items-center justify-center font-bold text-xs"
                            >
                              +
                            </button>
                          </div>

                          {/* Availability Toggle */}
                          <button 
                            onClick={() => handleToggleItemAvailability(selectedOrder, idx)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-wider uppercase transition-all border ${
                              item.unavailable 
                                ? 'bg-green-50 hover:bg-green-100 text-green-600 border-green-200 shadow-sm' 
                                : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-100'
                            }`}
                          >
                            {item.unavailable ? "Mark In Stock" : "Mark Out of Stock"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Billing Summary */}
                <div className="border-t border-zinc-100 pt-4 space-y-2">
                  <div className="flex justify-between items-center opacity-60">
                    <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Subtotal</span>
                    <span className="text-xs font-bold text-zinc-900">₹{selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center opacity-60">
                    <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Taxes & Charges</span>
                    <span className="text-xs font-bold text-zinc-900">₹{selectedOrder.tax.toFixed(2)}</span>
                  </div>
                  {(selectedOrder.total - selectedOrder.subtotal - selectedOrder.tax) > 0 && (
                    <div className="flex justify-between items-center opacity-60">
                      <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Delivery & handling fee</span>
                      <span className="text-xs font-bold text-zinc-900">
                        ₹{(selectedOrder.total - selectedOrder.subtotal - selectedOrder.tax).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-100/50">
                    <span className="text-[10px] font-black tracking-widest text-zinc-900 uppercase">Paid via {selectedOrder.paymentMethod || 'COD'}</span>
                    <span className="text-xl font-headline font-black text-primary tracking-tighter">₹{selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
