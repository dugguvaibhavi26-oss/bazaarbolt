"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useDragControls } from "framer-motion";
import { Product } from "@/types";
import { ProductDetails } from "./ProductDetails";
import { Portal } from "./Portal";
import { useStore } from "@/store/useStore";

interface ProductBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  products: Product[];
}

export function ProductBottomSheet({ isOpen, onClose, productId, products }: ProductBottomSheetProps) {
  const [currentId, setCurrentId] = useState(productId);
  const [snapState, setSnapState] = useState<"closed" | "card" | "full">("closed");
  const { cart, addToCart, updateQuantity } = useStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  const [windowHeight, setWindowHeight] = useState(800);
  useEffect(() => {
    setWindowHeight(window.innerHeight);
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const y = useMotionValue(windowHeight);

  const SNAP_CLOSED = windowHeight;
  const SNAP_CARD = windowHeight * 0.22; // 22% from top, leaves exactly enough room
  const SNAP_FULL = 0;

  useEffect(() => {
    if (isOpen) {
      setCurrentId(productId);
      setSnapState("card");
      document.body.style.overflow = "hidden";
    } else {
      setSnapState("closed");
      document.body.style.overflow = "unset";
    }
  }, [isOpen, productId]);

  useEffect(() => {
    if (snapState === "full") {
      animate(y, SNAP_FULL, { type: "spring", damping: 25, stiffness: 300, mass: 0.8 });
    } else if (snapState === "card") {
      animate(y, SNAP_CARD, { type: "spring", damping: 25, stiffness: 300, mass: 0.8 });
    } else if (snapState === "closed") {
      animate(y, SNAP_CLOSED, { type: "spring", damping: 25, stiffness: 300, mass: 0.8 });
    }
  }, [snapState, SNAP_CARD, SNAP_CLOSED, SNAP_FULL, y]);

  // Visual transitions based on y position
  const sheetHeight = useTransform(y, [SNAP_FULL, SNAP_CARD], [windowHeight, windowHeight - 110 - SNAP_CARD]);
  const borderRadius = useTransform(y, [SNAP_FULL, SNAP_CARD], [0, 32]);
  const bottomRadius = useTransform(y, [SNAP_FULL, SNAP_CARD], [0, 24]);
  
  const backdropOpacity = useTransform(y, [SNAP_FULL, SNAP_CARD, SNAP_CLOSED], [0.6, 0.4, 0]);
  
  // Fade out thumbnails as we approach FULL
  const thumbOpacity = useTransform(y, [SNAP_CARD * 0.5, SNAP_CARD], [0, 1]);
  const thumbY = useTransform(y, [SNAP_CARD * 0.5, SNAP_CARD], [50, 0]);
  const pointerOpacity = useTransform(y, [SNAP_CARD * 0.8, SNAP_CARD], [0, 1]);

  const product = products.find(p => p.id === currentId);
  const cartItem = cart.find(c => c.id === currentId);
  const outOfStock = product ? product.stock <= 0 : true;

  const currentIndex = products.findIndex((p) => p.id === currentId);

  const handleNext = () => {
    if (snapState === "full") return;
    const nextIndex = (currentIndex + 1) % products.length;
    setCurrentId(products[nextIndex].id);
  };

  const handlePrev = () => {
    if (snapState === "full") return;
    const prevIndex = (currentIndex - 1 + products.length) % products.length;
    setCurrentId(products[prevIndex].id);
  };

  const handleDragEnd = (_: any, info: any) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;
    
    if (snapState === "card") {
      if (offset > 100 || velocity > 500) {
        onClose();
      } else if (offset < -50 || velocity < -500) {
        setSnapState("full");
      } else {
        animate(y, SNAP_CARD, { type: "spring", damping: 25, stiffness: 300 });
      }
    } else if (snapState === "full") {
      if (offset > 100 || velocity > 500) {
        setSnapState("card");
      } else {
        animate(y, SNAP_FULL, { type: "spring", damping: 25, stiffness: 300 });
      }
    }
  };

  // Custom touch handling for pull-to-close in full screen mode
  const [touchStartY, setTouchStartY] = useState(0);
  const [isPullingDown, setIsPullingDown] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (snapState !== "full") return;
    if (contentRef.current && contentRef.current.scrollTop <= 0) {
      setTouchStartY(e.touches[0].clientY);
      setIsPullingDown(true);
    } else {
      setIsPullingDown(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingDown || snapState !== "full") return;
    const touchY = e.touches[0].clientY;
    const deltaY = touchY - touchStartY;
    
    if (deltaY > 0) {
      y.set(deltaY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isPullingDown || snapState !== "full") return;
    setIsPullingDown(false);
    
    const currentY = y.get();

    if (currentY > 100) {
      setSnapState("card");
    } else {
      animate(y, SNAP_FULL, { type: "spring", damping: 25, stiffness: 300 });
    }
  };

  let visibleProducts = products;
  if (products.length > 5) {
    let start = currentIndex - 2;
    let end = currentIndex + 3;
    if (start < 0) {
      end += Math.abs(start);
      start = 0;
    }
    if (end > products.length) {
      start -= (end - products.length);
      end = products.length;
    }
    start = Math.max(0, start);
    visibleProducts = products.slice(start, end);
  }

  if (!isOpen && snapState === "closed") return null;

  return (
    <Portal>
      <div className={`fixed inset-0 z-[100] flex items-end justify-center ${snapState === 'closed' ? 'pointer-events-none' : ''}`}>
        {/* Backdrop */}
        <motion.div
          style={{ opacity: backdropOpacity }}
          onClick={onClose}
          className="absolute inset-0 bg-black backdrop-blur-[2px] pointer-events-auto"
        />

        {/* Outer Draggable Sheet Wrapper */}
        <motion.div
          style={{ y }}
          drag="y"
          dragDirectionLock
          dragControls={dragControls}
          dragListener={snapState === "card"}
          dragConstraints={{ top: SNAP_FULL, bottom: SNAP_CLOSED }}
          dragElastic={0.05}
          onDragEnd={handleDragEnd}
          className="absolute top-0 left-0 right-0 w-full max-w-2xl mx-auto flex flex-col items-center pointer-events-auto h-screen"
        >
          {/* White Card Container */}
          <motion.div 
            style={{
              height: sheetHeight,
              borderTopLeftRadius: borderRadius,
              borderTopRightRadius: borderRadius,
              borderBottomLeftRadius: bottomRadius,
              borderBottomRightRadius: bottomRadius,
            }}
            className="bg-zinc-50 relative flex flex-col w-full sm:w-[96%] z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] pointer-events-auto"
          >
            {/* Header Area (Drag handle) */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              className="absolute top-0 left-0 right-0 h-12 flex flex-col items-center justify-start pt-3 z-[130] touch-none cursor-grab active:cursor-grabbing"
            >
              <div className="w-12 h-1.5 bg-zinc-300 rounded-full" />
            </div>

            {/* Close Button */}
            <div className="absolute top-4 left-4 z-[130]">
              <button 
                onClick={onClose} 
                className="w-9 h-9 bg-white shadow-md rounded-full flex items-center justify-center active:scale-90 transition-transform border border-zinc-100"
              >
                <span className="material-symbols-outlined text-zinc-900 font-bold text-[18px]">close</span>
              </button>
            </div>

            {/* Main Content Area */}
            <div 
              className="flex-1 overflow-hidden relative mt-12 rounded-b-[inherit]"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentId}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  drag={snapState === "card" ? "x" : false}
                  dragDirectionLock
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -50) handleNext();
                    else if (info.offset.x > 50) handlePrev();
                  }}
                  className="h-full"
                >
                  <div 
                    ref={contentRef}
                    className={`h-full ${snapState === 'full' ? 'overflow-y-scroll scroll-smooth' : 'overflow-hidden'} hide-scrollbar rounded-b-[inherit]`}
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    <ProductDetails productId={currentId} isInsideBottomSheet onClose={onClose} />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Sticky Add Button */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-xl border-t border-zinc-100 z-[120] flex items-center justify-between pb-[max(1rem,env(safe-area-inset-bottom))] rounded-b-[inherit]">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-0.5">Best Price</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-zinc-900 leading-none">₹{product?.price.toFixed(0)}</span>
                  <span className="text-[10px] font-bold text-zinc-400 line-through">₹{(product?.price || 0) * 1.5}</span>
                </div>
              </div>
              
              <div className="w-[150px]">
                {outOfStock ? (
                  <button disabled className="w-full h-12 bg-red-50 text-red-600 border border-red-100 rounded-[14px] font-black text-[11px] tracking-widest cursor-not-allowed uppercase">
                    Sold Out
                  </button>
                ) : !cartItem ? (
                  <button 
                    onClick={() => product && addToCart({...product, quantity: 1})} 
                    className="w-full h-12 bg-[#1ed760] hover:bg-[#1db954] text-white rounded-[14px] font-black text-[11px] tracking-widest shadow-lg shadow-[#1ed760]/30 active:scale-95 transition-all uppercase flex items-center justify-center gap-2"
                  >
                    Add to cart
                    <span className="material-symbols-outlined text-[14px]">shopping_bag</span>
                  </button>
                ) : (
                  <div className="w-full h-12 bg-zinc-900 text-white rounded-[14px] flex items-center justify-between px-1 overflow-hidden shadow-2xl">
                    <button onClick={() => updateQuantity(product!.id, -1)} className="w-10 h-full flex items-center justify-center hover:bg-white/10 transition-colors">
                      <span className="material-symbols-outlined font-black text-[18px]">remove</span>
                    </button>
                    <span className="text-sm font-black">{cartItem.quantity}</span>
                    <button onClick={() => updateQuantity(product!.id, 1)} disabled={cartItem.quantity >= product!.stock} className="w-10 h-full flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-20">
                      <span className="material-symbols-outlined font-black text-[18px]">add</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Speech Bubble Pointer */}
            <motion.div 
              style={{ opacity: pointerOpacity }}
              className="absolute top-[calc(100%-2px)] left-1/2 -translate-x-1/2 w-14 h-4 bg-white/95 backdrop-blur-xl rounded-b-[14px]" 
            />
          </motion.div>
        </motion.div>

        {/* Fixed Thumbnails Row at Bottom */}
        <motion.div 
          className="fixed bottom-0 left-0 right-0 h-[110px] z-[150] flex items-center justify-center gap-3 px-2 pointer-events-auto"
          style={{ opacity: thumbOpacity, y: thumbY }}
        >
          {visibleProducts.map(p => (
            <button 
              key={p.id}
              onClick={() => setCurrentId(p.id)}
              className={`relative w-[60px] h-[60px] sm:w-[65px] sm:h-[65px] rounded-[16px] overflow-hidden bg-white shrink-0 transition-all duration-300 ease-out ${p.id === currentId ? 'ring-[3px] ring-white scale-[1.15] shadow-xl z-10' : 'opacity-60 scale-95 hover:opacity-100 hover:scale-100 shadow-sm'}`}
            >
              <img src={p.image} className="w-full h-full object-contain p-2" />
              {p.id === currentId && (
                <div className="absolute inset-0 bg-black/5 pointer-events-none" />
              )}
            </button>
          ))}
        </motion.div>
      </div>
    </Portal>
  );
}
