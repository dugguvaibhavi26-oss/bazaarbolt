"use client";

import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, arrayUnion, runTransaction, getDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Order, Product } from "@/types";
import { mapOrder } from "@/lib/mappers";
import toast from "react-hot-toast";

export default function VendorOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<"incoming" | "active" | "completed">("incoming");
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; orderId: string | null; reason: string }>({ isOpen: false, orderId: null, reason: "" });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "orders"),
      where("vendorId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(mapOrder));
    });

    return () => unsubscribe();
  }, [user]);

  const filteredOrders = orders.filter(o => {
    if (activeTab === "incoming") return o.status === "pending";
    if (activeTab === "active") return ["accepted", "preparing", "ready_for_pickup"].includes(o.status);
    if (activeTab === "completed") return ["DELIVERED", "cancelled"].includes(o.status);
    return false;
  });

  const updateOrderStatus = async (order: Order, newStatus: string) => {
    if (!order.id) return;
    const toastId = toast.loading("Updating status...");
    try {
      if (newStatus === "accepted") {
        // Run transaction for stock handling
        await runTransaction(db, async (transaction) => {
          const orderRef = doc(db, "orders", order.id!);
          
          // Check stock for each item
          for (const item of order.items) {
            const prodRef = doc(db, "products", item.id);
            const prodSnap = await transaction.get(prodRef);
            if (!prodSnap.exists()) throw new Error(`Product ${item.id} not found`);
            
            const prodData = prodSnap.data() as Product;
            if (prodData.stock < item.quantity) {
              throw new Error(`Insufficient stock for ${item.name}`);
            }
            
            const newStock = prodData.stock - item.quantity;
            transaction.update(prodRef, {
              stock: newStock,
              vendorAvailable: newStock > 0,
              lastUpdatedBy: "vendor",
              updatedAt: new Date().toISOString()
            });
          }

          transaction.update(orderRef, {
            status: newStatus,
            vendorAcceptedAt: new Date().toISOString(),
            logs: arrayUnion({
              status: newStatus,
              timestamp: new Date().toISOString(),
              user: "vendor"
            })
          });
        });
      } else {
        await updateDoc(doc(db, "orders", order.id), {
          status: newStatus,
          logs: arrayUnion({
            status: newStatus,
            timestamp: new Date().toISOString(),
            user: "vendor"
          })
        });
      }
      toast.success(`Order ${newStatus}`, { id: toastId });
    } catch (e: any) {
      toast.error(e.message || "Failed to update status", { id: toastId });
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelModal.orderId || !cancelModal.reason) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    const toastId = toast.loading("Cancelling order...");
    try {
      await updateDoc(doc(db, "orders", cancelModal.orderId), {
        status: "cancelled",
        cancelReason: cancelModal.reason,
        cancelledBy: "vendor",
        logs: arrayUnion({
          status: "cancelled",
          timestamp: new Date().toISOString(),
          user: "vendor",
          reason: cancelModal.reason
        })
      });
      toast.success("Order cancelled", { id: toastId });
      setCancelModal({ isOpen: false, orderId: null, reason: "" });
    } catch (e) {
      toast.error("Failed to cancel order", { id: toastId });
    }
  };

  const OrderCard = ({ order }: { order: Order }) => (
    <div className="bg-white p-6 rounded-[32px] border border-zinc-100 shadow-sm space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase mb-1">Order #{order.id?.slice(-6).toUpperCase()}</h4>
          <p className="text-sm font-black text-zinc-900 tracking-tight">{order.userName}</p>
          <p className="text-[10px] font-bold text-zinc-400 mt-0.5">{order.userPhone}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase ${
          order.status === 'pending' ? 'bg-orange-100 text-orange-600 animate-pulse' :
          order.status === 'accepted' ? 'bg-blue-100 text-blue-600' :
          order.status === 'ready_for_pickup' ? 'bg-green-100 text-green-600' :
          'bg-zinc-100 text-zinc-500'
        }`}>
          {order.status.replace(/_/g, ' ')}
        </div>
      </div>

      <div className="space-y-2 py-3 border-y border-zinc-50">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-zinc-600">{item.quantity}x {item.name}</span>
            <span className="text-[11px] font-black text-zinc-900">₹{item.price * item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-zinc-400 tracking-widest">TOTAL</span>
        <span className="text-sm font-black text-zinc-900">₹{order.total}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        {order.status === 'pending' && (
          <>
            <button 
              onClick={() => setCancelModal({ isOpen: true, orderId: order.id!, reason: "" })}
              className="px-4 py-4 rounded-2xl bg-zinc-50 text-zinc-400 font-black text-[10px] tracking-widest hover:bg-red-50 hover:text-red-500 transition-all"
            >
              REJECT
            </button>
            <button 
              onClick={() => updateOrderStatus(order, "accepted")}
              className="px-4 py-4 rounded-2xl bg-primary text-zinc-900 font-black text-[10px] tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              ACCEPT
            </button>
          </>
        )}
        
        {order.status === 'accepted' && (
          <>
            <button 
              onClick={() => setCancelModal({ isOpen: true, orderId: order.id!, reason: "" })}
              className="px-4 py-4 rounded-2xl bg-zinc-50 text-zinc-400 font-black text-[10px] tracking-widest hover:bg-red-50 hover:text-red-500 transition-all"
            >
              CANCEL
            </button>
            <button 
              onClick={() => updateOrderStatus(order, "preparing")}
              className="px-4 py-4 rounded-2xl bg-zinc-900 text-white font-black text-[10px] tracking-widest active:scale-95 transition-all"
            >
              START PREPARING
            </button>
          </>
        )}

        {order.status === 'preparing' && (
          <button 
            onClick={() => updateOrderStatus(order, "ready_for_pickup")}
            className="col-span-2 px-4 py-4 rounded-2xl bg-green-600 text-white font-black text-[10px] tracking-widest active:scale-95 transition-all"
          >
            READY FOR PICKUP
          </button>
        )}

        {order.status === 'ready_for_pickup' && (
          <div className="col-span-2 p-4 bg-zinc-50 rounded-2xl text-center">
            <p className="text-[10px] font-black text-zinc-400 tracking-widest">AWAITING RIDER PICKUP</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
      <div className="flex bg-white p-1.5 rounded-[24px] border border-zinc-100 sticky top-[80px] z-40 shadow-sm">
        <button 
          onClick={() => setActiveTab("incoming")}
          className={`flex-1 py-3.5 rounded-[18px] text-[10px] font-black tracking-widest transition-all ${activeTab === 'incoming' ? 'bg-primary text-zinc-900 shadow-md' : 'text-zinc-400'}`}
        >
          INCOMING
          {orders.filter(o => o.status === 'pending').length > 0 && (
            <span className="ml-2 bg-zinc-900 text-white px-2 py-0.5 rounded-full text-[8px] animate-pulse">
              {orders.filter(o => o.status === 'pending').length}
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

      {/* Cancel Modal */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-[100] bg-zinc-950/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white max-w-sm w-full rounded-[40px] p-8 shadow-2xl relative animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-500 overflow-hidden">
            <h3 className="text-xl font-black text-zinc-900 tracking-tight mb-2">Cancel Order?</h3>
            <p className="text-[10px] font-bold text-zinc-400 tracking-widest mb-6 uppercase leading-relaxed">
              Please provide a valid reason for cancelling this order. This will be logged.
            </p>
            
            <textarea 
              className="w-full bg-zinc-50 border-zinc-100 rounded-2xl p-4 text-sm font-bold placeholder:text-zinc-300 focus:ring-4 focus:ring-red-100 transition-all min-h-[120px] mb-6"
              placeholder="e.g. Out of stock, Store closing early..."
              value={cancelModal.reason}
              onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setCancelModal({ isOpen: false, orderId: null, reason: "" })}
                className="py-4 rounded-2xl bg-zinc-50 text-zinc-400 font-black text-[10px] tracking-widest transition-all"
              >
                BACK
              </button>
              <button 
                onClick={handleCancelOrder}
                className="py-4 rounded-2xl bg-red-500 text-white font-black text-[10px] tracking-widest shadow-xl shadow-red-200 transition-all active:scale-95"
              >
                CONFIRM CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
