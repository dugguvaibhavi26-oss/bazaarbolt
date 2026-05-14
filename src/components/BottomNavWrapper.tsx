"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";
import { useStore } from "@/store/useStore";

export function BottomNavWrapper() {
  const pathname = usePathname();
  const { hideBottomNav } = useStore();
  
  // Hide bottom nav on admin, rider, login, checkout, cart, and search pages
  const hideOn = ["/admin", "/rider", "/vendor", "/login", "/checkout", "/cart", "/product", "/search", "/privacypolicy", "/terms"];
  const shouldHide = hideBottomNav || hideOn.some(path => pathname === path || pathname.startsWith(path + "/"));
  
  if (shouldHide) return null;
  
  return <BottomNav />;
}
