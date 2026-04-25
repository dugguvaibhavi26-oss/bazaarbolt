"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

export function BottomNavWrapper() {
  const pathname = usePathname();
  
  // Hide bottom nav on admin, rider, login, checkout, cart, and search pages
  const hideOn = ["/admin", "/rider", "/vendor", "/login", "/checkout", "/cart", "/product", "/search"];
  const shouldHide = hideOn.some(path => pathname === path || pathname.startsWith(path + "/"));
  
  if (shouldHide) return null;
  
  return <BottomNav />;
}
