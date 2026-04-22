"use client";

import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/store/useStore";
import { useEffect, useRef, useState } from "react";

export const BottomNav = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { cart } = useStore();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  
  const navItems = [
    { label: "Home", icon: "home", href: "/" },
    { label: "Orders", icon: "history", href: "/orders" },
    { label: "Helpdesk", icon: "support_agent", href: "/help" },
  ];

  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Scroll down -> hide
      if (currentScrollY > lastScrollY.current + 10 && currentScrollY > 50) {
        setIsVisible(false);
      } 
      // Scroll up or at top -> show
      else if (currentScrollY < lastScrollY.current - 10 || currentScrollY < 50) {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateIndicator = () => {
      if (!containerRef.current) return;
      
      const activeElement = containerRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeElement) {
        setIsMoving(true);
        setIndicatorStyle({
          left: activeElement.offsetLeft,
          width: activeElement.offsetWidth,
        });
        // Reset moving state after animation
        const timer = setTimeout(() => setIsMoving(false), 600);
        return () => clearTimeout(timer);
      }
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [pathname, navItems.length]); // added navItems.length so it recalculates if items change

  return (
    <div className={`fixed bottom-4 left-0 w-full z-50 flex flex-col items-center px-4 pointer-events-none mb-safe transition-all duration-500 ease-in-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0'}`}>
      
      {/* Floating Cart Button */}
      <div className="w-full max-w-md flex justify-end mb-4 pointer-events-none">
        <button 
          onClick={() => router.push('/cart')} 
          className={`pointer-events-auto bg-primary text-zinc-900 shadow-xl flex items-center justify-center transition-all duration-300 ease-out active:scale-95 ${cartCount > 0 ? 'rounded-full px-5 py-3.5 gap-2' : 'rounded-full w-14 h-14'}`}
        >
          <span className="material-symbols-outlined text-[24px] font-black" style={{ fontVariationSettings: "'FILL'1" }}>shopping_bag</span>
          {cartCount > 0 && (
            <span className="font-headline font-black text-sm tracking-widest whitespace-nowrap">+{cartCount}</span>
          )}
        </button>
      </div>

      <nav 
        ref={containerRef}
        className="bg-white/95 backdrop-blur-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] border border-zinc-100 rounded-[36px] p-2 flex items-center justify-between w-full max-w-md pointer-events-auto relative overflow-hidden"
      >
        {/* The Sliding Oval Indicator */}
        <div 
          className={`absolute h-12 bg-primary/10 rounded-2xl transition-all duration-[600ms] ${
            isMoving ? "ease-[cubic-bezier(0.68,-0.6,0.32,1.6)] scale-y-[0.9] scale-x-[1.05]" : "ease-[cubic-bezier(0.4,0,0.2,1)] scale-100"
          }`}
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />

        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <button
              key={item.href}
              data-active={isActive}
              onClick={() => router.push(item.href)}
              className={`relative z-10 flex items-center justify-center h-12 rounded-2xl group outline-none transition-all duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                isActive ? "flex-grow-[2.8]" : "flex-grow-[1]"
              }`}
            >
              <div className="flex items-center gap-2 pointer-events-none">
                <div className="relative">
                  <span 
                    className={`material-symbols-outlined text-[24px] transition-all duration-500 ${
                      isActive ? "text-primary scale-110" : "text-zinc-400 group-hover:text-zinc-600 scale-100"
                    }`}
                    style={{ fontVariationSettings: isActive ? "'FILL'1" : "'FILL'0" }}
                  >
                    {item.label === 'Helpdesk' ? 'support_agent' : item.icon}
                  </span>
                </div>

                <div 
                  className={`flex items-center overflow-hidden transition-all duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    isActive ? "max-w-[100px] opacity-100 ml-1" : "max-w-0 opacity-0"
                  }`}
                >
                  <span className="font-headline font-black text-xs text-primary whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
