"use client";

import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useStore } from "@/store/useStore";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, loading: authLoading, signOut } = useAuth();
  const { initSettings } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    initSettings();
  }, [initSettings]);

 const nav = [
 { label: "Dashboard", href: "/admin", icon: "dashboard"},
 { label: "Orders", href: "/admin/orders", icon: "shopping_bag"},
 { label: "Inventory", href: "/admin/products", icon: "inventory_2"},
 { label: "Personnel", href: "/admin/riders", icon: "delivery_dining"},
 {label: "Categories", href: "/admin/categories", icon: "category"},
 {label: "Delivery Slots", href: "/admin/delivery", icon: "schedule_send"},
 {label: "Coupons", href: "/admin/coupons", icon: "local_activity"},
 { label: "Payments", href: "/admin/payments", icon: "payments"},
 { label: "Help & FAQs", href: "/admin/help", icon: "live_help"},
 { label: "Push Alerts", href: "/admin/notifications", icon: "notification_important"},
 { label: "Store Settings", href: "/admin/settings", icon: "settings"},
 ];

 useEffect(() => {
 if (!authLoading) {
 if (!user || role !== 'admin') {
 if (pathname !== '/admin/login') {
 router.push("/admin/login");
 }
 } else if (pathname === '/admin/login') {
 router.push("/admin");
 }
 }
 }, [user, role, authLoading, pathname, router]);

 if (authLoading) {
 return (
 <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
 <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
 </div>
 );
 }

 // If at login page and role is admin, the useEffect will redirect.
 // We can render children at login page without sidebar.
 if (pathname === '/admin/login') {
 return <>{children}</>;
 }

  if (role !== 'admin') {
    return null;
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-zinc-900 shadow-2xl">
      <div className="p-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center p-1 shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-zinc-900 font-black">bolt</span>
            </div>
            <h1 className="text-xl font-black text-white font-headline tracking-tighter">BazaarBolt</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-zinc-500 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="text-[10px] font-black tracking-widest text-zinc-500 ml-1">Admin Central</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto hide-scrollbar">
        {nav.map(item => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group
              ${isActive ? 'bg-primary text-zinc-900 shadow-lg shadow-primary/20' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}
            `}>
              <span className={`material-symbols-outlined text-[20px] transition-transform group-hover:scale-110 ${isActive ? 'font-bold' : ''}`} style={{ fontVariationSettings: isActive ? "'FILL'1" : "'FILL'0" }}>
                {item.icon}
              </span>
              <span className={`text-xs font-black tracking-widest ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-zinc-900 rounded-full"></div>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-6 mt-auto">
        <div className="bg-white/5 rounded-3xl p-5 mb-6 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-white/10">
              <span className="material-symbols-outlined text-zinc-400 text-xl">person</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-white truncate max-w-[120px]">{user?.email?.split('@')[0] || "Admin"}</span>
              <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase leading-none">Master Access</span>
            </div>
          </div>
        </div>
        <button onClick={() => {
          signOut();
          toast.success("Signed out from Admin");
          router.push("/admin/login");
        }} className="flex items-center justify-center gap-3 px-5 py-4 text-red-400 hover:bg-red-500/10 rounded-2xl w-full transition-all font-black tracking-widest text-[10px] border border-red-500/20 group"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:rotate-180 transition-transform duration-500">logout</span>
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col lg:flex-row relative">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-zinc-900 flex-col h-screen sticky top-0 shadow-2xl z-50">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
          <div className="absolute top-0 left-0 w-72 h-full animate-in slide-in-from-left duration-300">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <header className="h-20 lg:h-24 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-4 lg:px-12 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-zinc-100 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-zinc-900">menu</span>
            </button>
            <h2 className="text-sm lg:text-lg font-headline font-black text-zinc-900 tracking-tight leading-none">
              {nav.find(n => pathname === n.href || (n.href !== '/admin' && pathname.startsWith(n.href)))?.label || "Admin Console"}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 lg:gap-6">
            <div className="hidden sm:flex items-center gap-2 bg-zinc-100 px-4 py-2 rounded-xl">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Live</span>
            </div>
            <button className="w-10 h-10 lg:w-12 lg:h-12 bg-white border border-zinc-200 rounded-xl flex items-center justify-center hover:bg-zinc-50 transition-colors relative">
              <span className="material-symbols-outlined text-zinc-400">notifications</span>
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 p-4 lg:p-12 relative">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
