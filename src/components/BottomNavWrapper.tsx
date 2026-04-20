"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

export function BottomNavWrapper() {
  const pathname = usePathname();
  
  // Hide bottom nav on admin, rider, and login pages
  const hideOn = ["/admin", "/rider", "/login"];
  const shouldHide = hideOn.some(path => pathname.startsWith(path));
  
  if (shouldHide) return null;
  
  return <BottomNav />;
}
