"use client";

import { ShoppingBag, Menu, UserCircle } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useStore } from "@/store/useStore";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Navbar() {
  const { user, signInAsGuest, signOut } = useAuth();
  const cart = useStore(state => state.cart);
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? "bg-white/90 backdrop-blur-md shadow-sm" : "bg-white"}`}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
          BazaarBolt
        </Link>
        
        <div className="flex items-center gap-4">
          {!user ? (
            <Link 
              href="/login"
              className="text-sm font-medium text-gray-700 hover:text-[var(--primary)] transition-colors"
            >
              Sign In
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/orders" className="text-sm font-medium text-gray-700 hover:text-[var(--primary)]">
                My Orders
              </Link>
              <button 
                onClick={signOut}
                className="text-sm font-medium text-gray-700 hover:text-red-500 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}

          <Link href="/cart" className="relative p-2 text-gray-700 hover:text-[var(--primary)] transition-colors">
            <ShoppingBag className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 bg-[var(--primary)] text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
