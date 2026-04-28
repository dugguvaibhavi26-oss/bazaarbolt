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
    { label: "Search", icon: "search", href: "/search" },
    { label: "Orders", icon: "history", href: "/orders" },
    { label: "Helpdesk", icon: "support_agent", href: "/help" },
    { label: "Cart", icon: "shopping_bag", href: "/cart" },
  ];

  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 50) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
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

  const isCartPillVisible = !isVisible && cartCount > 0;

  return (
    <>
      {/* Floating View Cart Pill (Shows when navbar is hidden) */}
      <div className={`fixed bottom-6 left-0 w-full z-[45] flex justify-center px-4 pointer-events-none mb-safe transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isCartPillVisible ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0'}`}>
        <div className="w-full max-w-md">
          <button 
            onClick={() => router.push('/cart')} 
            className="pointer-events-auto w-full bg-[#318b18] text-white shadow-2xl rounded-[24px] lg:rounded-full p-2.5 lg:p-3 flex items-center justify-between active:scale-95 transition-transform"
          >
            {/* Left: Overlapping product images */}
            <div className="flex items-center -space-x-4 pl-1">
              {cart.slice(0, 3).map((item, idx) => (
                <div key={idx} className="w-12 h-12 rounded-full bg-white border-[1.5px] border-[#318b18] overflow-hidden flex-shrink-0 z-[3] relative">
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain p-1" />
                </div>
              ))}
            </div>

            {/* Center: Text */}
            <div className="flex flex-col items-center flex-1">
              <span className="font-headline font-black text-lg tracking-tight leading-none mb-0.5">View cart</span>
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase opacity-90">{cartCount} ITEMS</span>
            </div>

            {/* Right: Chevron */}
            <div className="pr-4">
              <span className="material-symbols-outlined text-3xl font-bold">chevron_right</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Bottom Navbar */}
      <div className={`fixed bottom-4 left-0 w-full z-50 flex flex-col items-center px-4 pointer-events-none mb-safe transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0'}`}>
        <nav 
          ref={containerRef}
          className="bg-white/95 backdrop-blur-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] border border-zinc-100 rounded-[36px] p-2 flex items-center justify-between w-full max-w-md pointer-events-auto relative overflow-hidden"
        >
          {/* The Sliding Oval Indicator */}
          <div 
            className={`absolute h-10 lg:h-12 bg-primary/10 rounded-xl lg:rounded-2xl transition-all duration-[600ms] ${
              isMoving ? "ease-[cubic-bezier(0.68,-0.6,0.32,1.6)] scale-y-[0.9] scale-x-[1.05]" : "ease-[cubic-bezier(0.4,0,0.2,1)] scale-100"
            }`}
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              top: '50%',
              transform: `translateY(-50%) ${isMoving ? 'scale-y-[0.9] scale-x-[1.05]' : 'scale-100'}`
            }}
          />

          {navItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <button
                key={item.href}
                data-active={isActive}
                onClick={() => router.push(item.href)}
                className={`relative z-10 flex items-center justify-center h-10 lg:h-12 rounded-xl lg:rounded-2xl group outline-none transition-all duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isActive ? "flex-[2.5]" : "flex-[1]"
                }`}
              >
                <div className="flex items-center gap-1 lg:gap-2 pointer-events-none">
                  <div className="relative">
                    <span 
                      className={`material-symbols-outlined text-[20px] lg:text-[24px] transition-all duration-500 ${
                        isActive ? "text-primary scale-110" : "text-zinc-400 group-hover:text-zinc-600 scale-100"
                      }`}
                      style={{ fontVariationSettings: isActive ? "'FILL'1" : "'FILL'0" }}
                    >
                      {item.label === 'Helpdesk' ? 'support_agent' : item.icon}
                    </span>
                    
                    {item.label === "Cart" && cartCount > 0 && !isActive && (
                      <div className="absolute -top-1.5 -right-2 bg-primary text-zinc-900 text-[7px] lg:text-[8px] font-black w-3.5 h-3.5 lg:w-4 lg:h-4 rounded-full flex items-center justify-center shadow-sm border border-white">
                        {cartCount}
                      </div>
                    )}
                  </div>
  
                  <div 
                    className={`flex items-center overflow-hidden transition-all duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                      isActive ? "max-w-[80px] lg:max-w-[100px] opacity-100 ml-0.5 lg:ml-1" : "max-w-0 opacity-0"
                    }`}
                  >
                    <span className="font-headline font-black text-[10px] lg:text-xs text-primary whitespace-nowrap">
                      {item.label}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};
