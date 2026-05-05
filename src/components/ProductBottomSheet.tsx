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
  const SNAP_CARD = windowHeight * 0.35; // 65% height means 35% from top
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

  // Visual transitions based on y position (real-time during drag)
  const borderRadius = useTransform(y, [SNAP_FULL, SNAP_CARD], [0, 24]);
  const backdropOpacity = useTransform(y, [SNAP_FULL, SNAP_CARD, SNAP_CLOSED], [0.6, 0.4, 0]);
  const boxShadow = useTransform(y, [SNAP_FULL, SNAP_CARD], [
    "none",
    "0px -10px 40px rgba(0,0,0,0.2)"
  ]);

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
      } else if (offset < -100 || velocity < -500) {
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
      // User is dragging down from the top of the scroll container
      y.set(deltaY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isPullingDown || snapState !== "full") return;
    setIsPullingDown(false);
    
    const currentY = y.get();
    const velocity = currentY > touchStartY ? 500 : 0; // Simple velocity fake for touch end

    if (currentY > 100) {
      setSnapState("card");
    } else {
      animate(y, SNAP_FULL, { type: "spring", damping: 25, stiffness: 300 });
    }
  };

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

        {/* Sheet */}
        <motion.div
          style={{ y, borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius, boxShadow }}
          drag="y"
          dragDirectionLock
          dragControls={dragControls}
          dragListener={snapState === "card"}
          dragConstraints={{ top: SNAP_FULL, bottom: SNAP_CLOSED }}
          dragElastic={0.05}
          onDragEnd={handleDragEnd}
          className="relative w-full max-w-2xl bg-zinc-50 flex flex-col h-screen overflow-hidden pointer-events-auto"
        >
          {/* Header Area (Always draggable handle) */}
          <div 
            onPointerDown={(e) => dragControls.start(e)}
            className="absolute top-0 left-0 right-0 h-14 flex flex-col items-center justify-start pt-4 z-[130] cursor-grab active:cursor-grabbing touch-none"
          >
            <div className="w-12 h-1.5 bg-zinc-300 rounded-full" />
          </div>

          {/* Sticky Header Icons */}
          <div className="absolute top-5 left-6 right-6 flex justify-between items-center z-[130] pointer-events-none">
            <button 
              onClick={onClose} 
              className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full shadow-sm flex items-center justify-center pointer-events-auto active:scale-90 transition-transform border border-zinc-100"
            >
              <span className="material-symbols-outlined text-zinc-900 font-bold">close</span>
            </button>
          </div>

          {/* Main Content Area */}
          <div 
            className="flex-1 overflow-hidden relative mt-14"
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
                  className={`h-full ${snapState === 'full' ? 'overflow-y-auto' : 'overflow-hidden'} hide-scrollbar scroll-smooth`}
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <ProductDetails productId={currentId} isInsideBottomSheet onClose={onClose} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sticky Add Button */}
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-white/90 backdrop-blur-2xl border-t border-zinc-100 z-[120] flex items-center justify-between pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Best Price</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-zinc-900">₹{product?.price.toFixed(0)}</span>
                <span className="text-xs font-bold text-zinc-400 line-through">₹{(product?.price || 0) * 1.5}</span>
              </div>
            </div>
            
            <div className="w-44">
              {outOfStock ? (
                <button disabled className="w-full h-14 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-black text-xs tracking-widest cursor-not-allowed uppercase">
                  Sold Out
                </button>
              ) : !cartItem ? (
                <button 
                  onClick={() => product && addToCart({...product, quantity: 1})} 
                  className="w-full h-14 bg-primary text-zinc-900 rounded-2xl font-black text-xs tracking-[0.1em] shadow-xl shadow-primary/20 active:scale-95 transition-all uppercase flex items-center justify-center gap-2"
                >
                  Add to cart
                  <span className="material-symbols-outlined text-sm">shopping_bag</span>
                </button>
              ) : (
                <div className="w-full h-14 bg-zinc-900 text-white rounded-2xl flex items-center justify-between px-2 overflow-hidden shadow-2xl">
                  <button onClick={() => updateQuantity(product!.id, -1)} className="w-14 h-full flex items-center justify-center hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined font-black">remove</span>
                  </button>
                  <span className="text-base font-black">{cartItem.quantity}</span>
                  <button onClick={() => updateQuantity(product!.id, 1)} disabled={cartItem.quantity >= product!.stock} className="w-14 h-full flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-20">
                    <span className="material-symbols-outlined font-black">add</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
}
