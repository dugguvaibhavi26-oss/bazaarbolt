"use client";

import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, arrayUnion, runTransaction, or } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Order, Product, OrderStatus } from "@/types";
import { mapOrder } from "@/lib/mappers";
import toast from "react-hot-toast";

export default function VendorOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<"incoming" | "active" | "completed">("incoming");

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "orders"),
      or(
        where("vendorId", "==", user.uid),
        where("vendorIds", "array-contains", user.uid)
      ),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(mapOrder));
    });

    return () => unsubscribe();
  }, [user]);

  const filteredOrders = orders.filter(o => {
    if (activeTab === "incoming") return o.status === "PLACED";
    if (activeTab === "active") return ["ACCEPTED", "PREPARING", "READY_FOR_PICKUP"].includes(o.status);
    if (activeTab === "completed") return ["DELIVERED", "CANCELLED"].includes(o.status);
    return false;
  });

  const handleItemAction = async (order: Order, itemIndex: number, action: "ACCEPT" | "REJECT") => {
    if (!order.id) return;
    const toastId = toast.loading(`Marking item as ${action.toLowerCase()}ed...`);
    
    try {
      const updatedItems = [...order.items];
      const item = updatedItems[itemIndex];
      const isRejecting = action === "REJECT";
      
      const newItem = {
        ...item,
        unavailable: isRejecting,
        vendorStatus: (isRejecting ? "REJECTED" : "ACCEPTED") as "REJECTED" | "ACCEPTED"
      };
      
      if (isRejecting) {
        newItem.unavailableAt = new Date().toISOString();
      } else {
        delete newItem.unavailableAt;
      }
      
      updatedItems[itemIndex] = newItem;

      // Recalculate totals if rejected
      let newSubtotal = order.subtotal;
      let newTax = order.tax;
      let newTotal = order.total;

      if (isRejecting) {
        const activeItems = updatedItems.filter(i => !i.unavailable);
        newSubtotal = activeItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        const taxPercent = order.subtotal > 0 ? (order.tax / order.subtotal) : 0.05;
        newTax = newSubtotal * taxPercent;
        const fixedCharges = order.total - order.subtotal - order.tax;
        newTotal = newSubtotal + newTax + (fixedCharges > 0 ? fixedCharges : 0);

        // Instantly mark the product as out of stock globally
        try {
          await updateDoc(doc(db, "products", item.id), { 
            stock: 0, 
            vendorAvailable: false,
            updatedAt: new Date().toISOString(),
            lastUpdatedBy: "vendor"
          });
        } catch (err) {
          console.error("Failed to update product stock", err);
        }
      } else {
        // If accepting, deduct stock
        await runTransaction(db, async (transaction) => {
          const prodRef = doc(db, "products", item.id);
          const prodSnap = await transaction.get(prodRef);
          if (prodSnap.exists()) {
             const stock = prodSnap.data()?.stock || 0;
             transaction.update(prodRef, { stock: Math.max(0, stock - item.quantity) });
          }
        });
      }

      const sanitizedItems = JSON.parse(JSON.stringify(updatedItems, (k, v) => v === undefined ? null : v));

      await updateDoc(doc(db, "orders", order.id), {
        items: sanitizedItems,
        subtotal: parseFloat(newSubtotal.toFixed(2)),
        tax: parseFloat(newTax.toFixed(2)),
        total: parseFloat(newTotal.toFixed(2))
      });

      toast.success(`Item ${action.toLowerCase()}ed`, { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Failed to update item", { id: toastId });
    }
  };

  const updateOrderStatus = async (order: Order, newStatus: OrderStatus) => {
    if (!order.id) return;
    const toastId = toast.loading("Updating order status...");
    try {
      await updateDoc(doc(db, "orders", order.id), {
        status: newStatus,
        logs: arrayUnion({
          status: newStatus,
          timestamp: new Date().toISOString(),
          user: "vendor"
        })
      });
      toast.success(`Order ${newStatus}`, { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Failed to update status", { id: toastId });
    }
  };

  const OrderCard = ({ order }: { order: Order }) => {
    // Only show items that belong to this vendor
    const vendorItemsWithIndex = order.items.map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => item.vendorId === user?.uid);

    if (vendorItemsWithIndex.length === 0) return null;

    const vendorTotal = vendorItemsWithIndex.reduce((acc, { item }) => acc + (item.unavailable ? 0 : item.price * item.quantity), 0);

    return (
      <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase mb-1">Order #{order.id?.slice(-6).toUpperCase()}</h4>
            <p className="text-sm font-black text-zinc-900 tracking-tight">{order.customerName}</p>
            <p className="text-[10px] font-bold text-zinc-400 mt-0.5">{order.phoneNumber}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase ${
            order.status === 'PLACED' ? 'bg-orange-100 text-orange-600 animate-pulse' :
            order.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-600' :
            order.status === 'READY_FOR_PICKUP' ? 'bg-green-100 text-green-600' :
            'bg-zinc-100 text-zinc-500'
          }`}>
            {order.status.replace(/_/g, ' ')}
          </div>
        </div>

        <div className="space-y-4 py-3 border-y border-zinc-50">
          <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase">Your Items</p>
          {vendorItemsWithIndex.map(({ item, originalIndex }) => {
            const isPending = !item.vendorStatus || item.vendorStatus === "PENDING";
            const isRejected = item.vendorStatus === "REJECTED";
            
            return (
              <div key={originalIndex} className={`flex flex-col gap-2 p-3 rounded-2xl border ${isRejected ? 'bg-red-50/50 border-red-100 opacity-80' : 'bg-zinc-50 border-zinc-100'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <img src={item.image} className="w-10 h-10 object-contain bg-white rounded-lg p-1" />
                    <div>
                      <span className={`text-[11px] font-bold ${isRejected ? 'text-red-500 line-through' : 'text-zinc-900'}`}>{item.quantity}x {item.name}</span>
                      <p className="text-[9px] font-black text-zinc-400">₹{item.price * item.quantity}</p>
                    </div>
                  </div>
                </div>
                {order.status === "PLACED" && isPending && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleItemAction(order, originalIndex, "REJECT")} className="flex-1 py-2 text-[9px] font-black bg-white border border-red-200 text-red-500 rounded-xl">NO STOCK</button>
                    <button onClick={() => handleItemAction(order, originalIndex, "ACCEPT")} className="flex-1 py-2 text-[9px] font-black bg-primary text-zinc-900 rounded-xl shadow-sm shadow-primary/20">CONFIRM</button>
                  </div>
                )}
                {isRejected && (
                  <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-1">Marked Unavailable</p>
                )}
                {item.vendorStatus === "ACCEPTED" && (
                  <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mt-1">Confirmed</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-zinc-400 tracking-widest">YOUR TOTAL EARNING</span>
          <span className="text-sm font-black text-zinc-900">₹{vendorTotal}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          {order.status === 'ACCEPTED' && (
            <button 
              onClick={() => updateOrderStatus(order, "PREPARING")}
              className="col-span-2 px-4 py-4 rounded-2xl bg-zinc-900 text-white font-black text-[10px] tracking-widest active:scale-95 transition-all"
            >
              START PREPARING
            </button>
          )}

          {order.status === 'PREPARING' && (
            <button 
              onClick={() => updateOrderStatus(order, "READY_FOR_PICKUP")}
              className="col-span-2 px-4 py-4 rounded-2xl bg-green-600 text-white font-black text-[10px] tracking-widest active:scale-95 transition-all"
            >
              READY FOR PICKUP
            </button>
          )}

          {order.status === 'READY_FOR_PICKUP' && (
            <div className="col-span-2 p-4 bg-zinc-50 rounded-2xl text-center">
              <p className="text-[10px] font-black text-zinc-400 tracking-widest">AWAITING RIDER PICKUP</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
      <div className="flex bg-white p-1.5 rounded-[24px] border border-zinc-100 sticky top-[80px] z-40 shadow-sm">
        <button 
          onClick={() => setActiveTab("incoming")}
          className={`flex-1 py-3.5 rounded-[18px] text-[10px] font-black tracking-widest transition-all ${activeTab === 'incoming' ? 'bg-primary text-zinc-900 shadow-md' : 'text-zinc-400'}`}
        >
          INCOMING
          {orders.filter(o => o.status === 'PLACED').length > 0 && (
            <span className="ml-2 bg-zinc-900 text-white px-2 py-0.5 rounded-full text-[8px] animate-pulse">
              {orders.filter(o => o.status === 'PLACED').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab("active")}
          className={`flex-1 py-3.5 rounded-[18px] text-[10px] font-black tracking-widest transition-all ${activeTab === 'active' ? 'bg-primary text-zinc-900 shadow-md' : 'text-zinc-400'}`}
        >
          ACTIVE
        </button>
        <button 
          onClick={() => setActiveTab("completed")}
          className={`flex-1 py-3.5 rounded-[18px] text-[10px] font-black tracking-widest transition-all ${activeTab === 'completed' ? 'bg-primary text-zinc-900 shadow-md' : 'text-zinc-400'}`}
        >
          HISTORY
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-zinc-300 text-3xl">inbox</span>
            </div>
            <p className="text-[10px] font-black text-zinc-400 tracking-widest uppercase">No {activeTab} orders</p>
          </div>
        ) : (
          filteredOrders.map(order => <OrderCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  );
}
