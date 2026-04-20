"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState("fadeIn");
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      setTransitionStage("fadeOut");
      prevPathname.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    if (transitionStage === "fadeOut") {
      const timer = setTimeout(() => {
        setDisplayChildren(children);
        setTransitionStage("fadeIn");
      }, 300); // Sync with CSS duration
      return () => clearTimeout(timer);
    } else {
      setDisplayChildren(children);
    }
  }, [children, transitionStage]);

  return (
    <div
      className={`transition-all duration-300 ease-in-out ${
        transitionStage === "fadeIn" 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-4"
      }`}
    >
      {displayChildren}
    </div>
  );
}
