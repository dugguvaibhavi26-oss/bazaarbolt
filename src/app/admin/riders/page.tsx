"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import { mapOrder, mapQuerySnapshot } from "@/lib/mappers";
import { Order } from "@/types";
import { Portal } from "@/components/Portal";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminRiders() {
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRider, setSelectedRider] = useState<any | null>(null);
  const [riderOrders, setRiderOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    // Find all users with role 'rider'
    const q = query(collection(db, "users"), where("role", "==", "rider"));
    const unsub = onSnapshot(q, (snap) => {
      const rdrs: any[] = [];
      snap.forEach(doc => rdrs.push({ id: doc.id, ...doc.data() }));
      setRiders(rdrs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedRider) {
      setRiderOrders([]);
      return;
    }
    setOrdersLoading(true);
    const q = query(
      collection(db, "orders"), 
      where("riderId", "==", selectedRider.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      try {
        const ords = mapQuerySnapshot(snap, mapOrder);
        setRiderOrders(ords);
      } catch (e) {
        console.error("Error mapping rider orders:", e);
      }
      setOrdersLoading(false);
    });
    return () => unsub();
  }, [selectedRider]);

  // Compute rider stats based on fetched orders
  const completedOrders = riderOrders.filter(o => o.status === "DELIVERED");
  const activeOrders = riderOrders.filter(o => !["DELIVERED", "CANCELLED"].includes(o.status));
  const totalEarnings = completedOrders.reduce((sum, o) => sum + (o.deliveryCharge || 30), 0);

  if (loading) return <div className="animate-pulse h-64 bg-white rounded-[40px]"/>;

  return (
    <div className="space-y-6 lg:space-y-8 pb-32">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl lg:text-2xl font-black text-zinc-900 tracking-tight">Personnel Network</h3>
          <p className="text-[10px] lg:text-xs font-bold text-zinc-400 tracking-widest mt-1 uppercase">Manage delivery riders and fleet status</p>
        </div>
        <button onClick={() => toast.success("Accessing recruitment portal...")} className="w-full lg:w-auto bg-zinc-900 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-2xl font-black text-[9px] lg:text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-black shadow-lg uppercase">
          <span className="material-symbols-outlined text-sm">person_add</span>
          Onboard Rider
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {riders.map((r) => (
          <div key={r.id} className="bg-white rounded-[28px] lg:rounded-[32px] p-5 lg:p-6 shadow-sm border border-zinc-100 group hover:shadow-xl transition-all">
            <div className="flex items-center gap-4 lg:gap-5 mb-5 lg:mb-6">
              <div className="w-14 h-14 lg:w-16 lg:h-16 bg-zinc-50 rounded-xl lg:rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-zinc-100 shadow-inner">
                <span className="material-symbols-outlined text-2xl lg:text-3xl font-black">delivery_dining</span>
              </div>
              <div className="flex-1">
                <h4 className="font-headline font-black text-zinc-900 leading-tight tracking-tighter text-sm lg:text-base">{r.name || "Active Rider"}</h4>
                <p className="text-[9px] lg:text-[10px] font-bold text-zinc-400 tracking-widest mt-0.5 uppercase truncate max-w-[120px] lg:max-w-none">{r.email}</p>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${r.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]': 'bg-red-500 animate-pulse'}`}></div>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:gap-3 mb-5 lg:mb-6">
              <div className="bg-zinc-50 p-2.5 lg:p-3 rounded-xl">
                <p className="text-[7px] lg:text-[8px] font-black text-zinc-400 tracking-widest mb-1 uppercase">Lifetime Trips</p>
                <p className="text-xs lg:text-sm font-black text-zinc-900">{r.totalTrips || 0}</p>
              </div>
              <div className="bg-zinc-50 p-2.5 lg:p-3 rounded-xl">
                <p className="text-[7px] lg:text-[8px] font-black text-zinc-400 tracking-widest mb-1 uppercase">Avg Rating</p>
                <p className="text-xs lg:text-sm font-black text-zinc-900">★ {r.rating || "4.9"}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-5 lg:pt-6 border-t border-zinc-100">
              <span className="text-[8px] lg:text-[9px] font-black text-zinc-400 tracking-widest uppercase">ID: {r.id.slice(0,8)}</span>
              <button 
                onClick={() => setSelectedRider(r)} 
                className="px-3 lg:px-4 py-1.5 lg:py-2 bg-zinc-900 text-white rounded-lg lg:rounded-xl text-[8px] lg:text-[9px] font-black tracking-widest opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity uppercase"
              >
                Performance
              </button>
            </div>
          </div>
        ))}

        {riders.length === 0 && (
          <div className="col-span-full py-20 bg-zinc-100 rounded-[40px] border border-dashed border-zinc-300 flex flex-col items-center">
            <span className="material-symbols-outlined text-5xl text-zinc-300 mb-4">no_accounts</span>
            <p className="text-zinc-500 font-black tracking-widest text-[10px]">No Riders Registered</p>
          </div>
        )}
      </div>

      {/* Rider Performance Drawer */}
      <AnimatePresence>
        {selectedRider && (
          <Portal>
            <div className="fixed inset-0 z-[100] bg-zinc-950/60 backdrop-blur-md flex justify-end animate-in fade-in duration-300">
              <div className="absolute inset-0" onClick={() => setSelectedRider(null)} />
              <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col relative z-10 animate-in slide-in-from-right duration-500">
                
                {/* Drawer Header */}
                <div className="px-6 py-6 border-b border-zinc-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-headline font-black text-zinc-900 tracking-tight leading-none">Rider Performance</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1.5">Fleets & Analytics Log</p>
                  </div>
                  <button 
                    onClick={() => setSelectedRider(null)} 
                    className="w-10 h-10 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center text-zinc-500 transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                  
                  {/* Hero Payout Card */}
                  <div className="bg-zinc-900 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-[100px] pointer-events-none"></div>
                    
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                        <span className="material-symbols-outlined text-3xl font-black">sports_motorsports</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-headline font-black text-white leading-none mb-1.5">{selectedRider.name || "Bolt Rider"}</h4>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${selectedRider.isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`}></span>
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{selectedRider.isOnline ? "Online" : "Offline"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-4 flex items-end justify-between">
                      <div>
                        <span className="text-[8px] font-black text-zinc-400 tracking-widest uppercase block mb-0.5">Fleet Lifetime Earnings</span>
                        <span className="text-3xl font-headline font-black text-primary tracking-tighter">₹{totalEarnings.toFixed(0)}</span>
                      </div>
                      <span className="text-[9px] font-black text-zinc-400 bg-white/10 px-2 py-1 rounded-lg">ID: #{selectedRider.id.slice(-8).toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Operational Metrics Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
                      <span className="material-symbols-outlined text-zinc-400 text-lg mb-1">verified</span>
                      <p className="text-[8px] font-black text-zinc-400 tracking-widest uppercase mb-0.5">Completed Trips</p>
                      <h5 className="text-lg font-headline font-black text-zinc-900">{completedOrders.length}</h5>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
                      <span className="material-symbols-outlined text-zinc-400 text-lg mb-1">pending_actions</span>
                      <p className="text-[8px] font-black text-zinc-400 tracking-widest uppercase mb-0.5">Active Queue</p>
                      <h5 className="text-lg font-headline font-black text-zinc-900">{activeOrders.length}</h5>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
                      <span className="material-symbols-outlined text-zinc-400 text-lg mb-1">grade</span>
                      <p className="text-[8px] font-black text-zinc-400 tracking-widest uppercase mb-0.5">Average Rating</p>
                      <h5 className="text-lg font-headline font-black text-zinc-900">★ {selectedRider.rating || "4.9"}</h5>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
                      <span className="material-symbols-outlined text-zinc-400 text-lg mb-1">contact_phone</span>
                      <p className="text-[8px] font-black text-zinc-400 tracking-widest uppercase mb-0.5">Phone Number</p>
                      <h5 className="text-xs font-black text-zinc-900 truncate mt-1">{selectedRider.phoneNumber || "N/A"}</h5>
                    </div>
                  </div>

                  {/* Rider Deliveries History Log */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-[10px] font-black text-zinc-900 tracking-widest uppercase">Delivery History Logs</h4>
                      <span className="text-[9px] font-black bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded">{riderOrders.length} Trips</span>
                    </div>

                    <div className="space-y-3">
                      {ordersLoading ? (
                        <div className="py-20 flex justify-center items-center">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : riderOrders.length === 0 ? (
                        <div className="py-12 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 text-center text-zinc-400">
                          <span className="material-symbols-outlined text-3xl mb-2">history</span>
                          <p className="text-[9px] font-black uppercase tracking-widest">No payout/trip logs found</p>
                        </div>
                      ) : (
                        riderOrders.map((o) => (
                          <div key={o.id} className="bg-white border border-zinc-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-[11px] font-black text-zinc-900">#{o.id!.slice(-8).toUpperCase()}</p>
                                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${
                                  o.status === 'DELIVERED' ? 'bg-green-50 text-green-600' :
                                  o.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                                  'bg-blue-50 text-blue-600'
                                }`}>{o.status}</span>
                              </div>
                              <p className="text-[9px] font-bold text-zinc-400 mt-1">
                                {new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p className="text-[9px] font-bold text-zinc-500 mt-0.5 truncate max-w-[200px]">
                                To: {o.customerName || 'Customer'} • {o.items.length} items
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-headline font-black text-zinc-900 leading-none">
                                {o.status === 'CANCELLED' ? '₹0.00' : `+₹${(o.deliveryCharge || 30).toFixed(0)}`}
                              </p>
                              <p className="text-[8px] font-black text-primary tracking-widest mt-1 uppercase">Payout Fee</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
}
