"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

export function BottomNavWrapper() {
  const pathname = usePathname();
  
  // Hide bottom nav on admin, rider, login, checkout, and product detail pages
  const hideOn = ["/admin", "/rider", "/login", "/checkout", "/product"];
  const shouldHide = hideOn.some(path => pathname.startsWith(path));
  
  if (shouldHide) return null;
  
  return <BottomNav />;
}
