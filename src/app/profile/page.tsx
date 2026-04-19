"use client";

import { useAuth } from "@/components/AuthProvider";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import toast from "react-hot-toast";

export default function ProfilePage() {
 const { user, loading, userData } = useAuth();
 const router = useRouter();

 useEffect(() => {
 if (!loading && !user) {
 router.push("/login");
 }
 }, [user, loading, router]);

 if (loading || !user) {
 return (
 <div className="min-h-screen bg-surface flex items-center justify-center">
 <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
 </div>
 );
 }

 const handleLogout = async () => {
 try {
 await signOut(auth);
 toast.success("Logged out successfully");
 router.push("/");
 } catch(e) {
 toast.error("Failed to logout");
 }
 };

 const menuSections = [
 {
 title: "Your Information",
 items: [
 { id: 'orders', label: "Your Orders", icon: "inventory_2", color: "text-blue-600 bg-blue-50", href: "/orders"},
 { id: 'address', label: "Address Book", icon: "location_on", color: "text-orange-600 bg-orange-50", onClick: () => toast.success("Address book opened") },
 { id: 'wishlist', label: "Wishlist", icon: "favorite", color: "text-pink-600 bg-pink-50", onClick: () => toast.success("Wishlist is empty") },
 { id: 'edit', label: "Edit Profile", icon: "edit_document", color: "text-purple-600 bg-purple-50", href: "/profile/edit"}
 ]
 },
 {
 title: "Support & More",
 items: [
 { id: 'help', label: "Need Help (FAQs)", icon: "support_agent", color: "text-emerald-600 bg-emerald-50", href: "/help"},
 { id: 'share', label: "Share the App", icon: "share", color: "text-indigo-600 bg-indigo-50", onClick: () => toast.success("Opening share sheet...") },
 { id: 'about', label: "About Us", icon: "info", color: "text-cyan-600 bg-cyan-50", onClick: () => toast.success("BazaarBolt v2.0") },
 { id: 'privacy', label: "Privacy Policy", icon: "policy", color: "text-zinc-600 bg-zinc-100", onClick: () => window.open("https://bazaarbolt.com/privacy-policy", "_blank") }
 ]
 }
 ];

 return (
 <main className="min-h-screen bg-surface pb-32">
 {/* Header */}
 <header className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm border-b border-surface-variant/50 pt-safe">
 <div className="flex items-center justify-between px-4 py-4 w-full max-w-3xl mx-auto">
 <button onClick={() => router.push("/")} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
 <span className="material-symbols-outlined text-zinc-900">arrow_back</span>
 </button>
 <h1 className="text-xl font-headline font-black text-zinc-900 tracking-tight">My Profile</h1>
 <div className="w-10"></div> {/* Spacer */}
 </div>
 </header>

 <div className="max-w-3xl mx-auto px-4 pt-6">
 {/* Profile Header Card */}
 <div className="bg-gradient-to-br from-zinc-900 to-black rounded-[32px] p-6 text-white mb-8 shadow-[0_12_24px_-8px_rgba(0,0,0,0.6)] relative overflow-hidden">
 <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-primary rounded-full mix-blend-multiply filter blur-[80px] opacity-20 pointer-events-none"></div>
 <div className="flex items-center gap-5 relative z-10">
 <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/20 backdrop-blur-sm">
 <span className="material-symbols-outlined text-4xl text-primary"style={{fontVariationSettings: "'FILL'1"}}>account_circle</span>
 </div>
 <div>
 <h2 className="font-headline font-black text-2xl tracking-tighter leading-tight drop-shadow-md ">
 {userData?.name || user.displayName || "Customer"}
 </h2>
 <p className="text-[10px] font-black text-zinc-400 tracking-[0.2em] mt-1">{userData?.phoneNumber || "No Phone Connected"}</p>
 <p className="text-[10px] font-bold text-zinc-500 truncate max-w-[200px] mt-0.5">{user.email}</p>
 <div className="mt-4 flex items-center gap-1.5 bg-white/10 w-fit px-2.5 py-1 rounded-lg backdrop-blur-md border border-white/10">
 <span className="material-symbols-outlined text-[12px] text-yellow-400"style={{fontVariationSettings: "'FILL'1"}}>stars</span>
 <span className="text-[9px] font-black tracking-widest text-white">BazaarBolt Member</span>
 </div>
 </div>
 </div>
 </div>

 {/* Menu Sections */}
 <div className="space-y-8">
 {menuSections.map((section, idx) => (
 <div key={idx}>
 <h3 className="font-headline font-bold text-sm text-zinc-500 tracking-widest mb-4 ml-2">{section.title}</h3>
 <div className="bg-surface-container-lowest border border-surface-variant/50 rounded-3xl shadow-sm overflow-hidden">
 {section.items.map((item, itemIdx) => {
 const isLast = itemIdx === section.items.length - 1;
 const innerContent = (
 <div className="flex justify-between items-center w-full">
 <div className="flex items-center gap-4">
 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.color}`}>
 <span className="material-symbols-outlined text-[20px]"style={{fontVariationSettings: "'FILL'1"}}>{item.icon}</span>
 </div>
 <span className="font-extrabold text-sm text-zinc-900">{item.label}</span>
 </div>
 <span className="material-symbols-outlined text-zinc-300 group-hover:translate-x-1 transition-transform group-hover:text-zinc-500">arrow_forward_ios</span>
 </div>
 );

 const classNameStr =`w-full max-w-full text-left p-4 bg-white hover:bg-zinc-50 transition-colors flex items-center justify-between group active:bg-zinc-100 ${!isLast ? 'border-b border-zinc-100': ''}`;

 if (item.href) {
 return (
 <Link key={item.id} href={item.href} className={classNameStr}>
 {innerContent}
 </Link>
 );
 }

 return (
 <button key={item.id} onClick={item.onClick} className={classNameStr}>
 {innerContent}
 </button>
 );
 })}
 </div>
 </div>
 ))}
 </div>

 {/* Logout Button */}
 <div className="mt-8 pt-4">
 <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-5 bg-red-50 text-red-600 rounded-3xl font-headline font-extrabold tracking-widest text-sm hover:bg-red-100 transition-colors border border-red-100 active:scale-95 shadow-sm">
 <span className="material-symbols-outlined text-lg">logout</span>
 Sign Out from BazaarBolt
 </button>
 </div>
 </div>
 </main>
 );
}
