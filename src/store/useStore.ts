import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppSettings, CartItem, Address } from "@/types";
import toast from "react-hot-toast";
import { mapSettings } from "@/lib/mappers";

interface StoreState {
  settings: AppSettings | null;
  settingsLoading: boolean;
  cart: CartItem[];
  selectedAddress: Address | null;
  activeCoupon: { code: string; discount: number } | null;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => void;
  removeCoupon: () => void;
  setSelectedAddress: (address: Address | null) => void;
  initSettings: () => () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      settings: null,
      settingsLoading: true,
      cart: [],
      selectedAddress: null,
      activeCoupon: null,

      setSelectedAddress: (address) => set({ selectedAddress: address }),

      addToCart: (item) => {
        const { cart } = get();
        const existing = cart.find(c => c.id === item.id);
        
        if (existing) {
          if (existing.quantity >= item.stock) {
            toast.error("Not enough stock available");
            return;
          }
          set({
            cart: cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
          });
          toast.success(`Increased ${item.name} quantity`);
        } else {
          if (item.stock < 1) {
            toast.error("Item is out of stock");
            return;
          }
          set({
            cart: [...cart, { ...item, quantity: 1 }]
          });
          toast.success(`Added ${item.name} to cart`);
        }
      },

      removeFromCart: (id) => {
        set({
          cart: get().cart.filter(c => c.id !== id)
        });
        toast.success("Item removed");
      },

      updateQuantity: (id, delta) => {
        const { cart } = get();
        const item = cart.find(c => c.id === id);
        if (!item) return;

        const newQ = item.quantity + delta;
        if (newQ > item.stock) {
          toast.error(`Only ${item.stock} left in stock`);
          return;
        }

        if (newQ <= 0) {
          set({ cart: cart.filter(c => c.id !== id) });
          toast.success("Item removed");
          return;
        }

        set({
          cart: cart.map(c => c.id === id ? { ...c, quantity: newQ } : c)
        });
      },

      clearCart: () => set({ cart: [], activeCoupon: null }),

      applyCoupon: (code) => {
        const { settings } = get();
        code = code.trim().toUpperCase();
        if (!code) {
            toast.error("Please enter a valid coupon code");
            return;
        }
        
        if (settings && settings.coupon && settings.coupon.code && settings.coupon.code.toUpperCase() === code) {
          set({ activeCoupon: { code: settings.coupon.code, discount: settings.coupon.discount || 0 } });
          toast.success(`Coupon applied! ${settings.coupon.discount}% max limits off`);
        } else if (code === "WELCOME50") {
          set({ activeCoupon: { code: "WELCOME50", discount: 50 } });
          toast.success("Coupon applied! ₹50 Off");
        } else {
          toast.error("Invalid coupon code");
        }
      },

      removeCoupon: () => {
        set({ activeCoupon: null });
        toast.success("Coupon removed");
      },

      initSettings: () => {
        const settingsRef = doc(db, "settings", "config");
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
          if (docSnap.exists()) {
            try {
              const data = mapSettings(docSnap);
              set({ settings: data, settingsLoading: false });
              if (data.primaryColor) {
                document.documentElement.style.setProperty('--primary', data.primaryColor);
              }
            } catch (e) {
              console.error("Settings error:", e);
              set({ settingsLoading: false });
            }
          } else {
            const defaultSettings: AppSettings = {
              storeOpen: true,
              bannerImage: "",
              announcement: "Welcome to BazaarBolt!",
              primaryColor: "#22c55e",
              taxPercent: 5,
              codEnabled: true,
              coupon: { code: "TRYNEW", discount: 10 },
              handlingCharge: 2,
              deliveryFee: 25,
              freeDeliveryThreshold: 500,
              smallCartFee: 20,
              smallCartThreshold: 99,
              customCharges: []
            };
            set({ settings: defaultSettings, settingsLoading: false });
          }
        });
        return unsubscribe;
      }
    }),
    {
      name: "bazaarbolt-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ cart: state.cart, selectedAddress: state.selectedAddress }),
    }
  )
);
