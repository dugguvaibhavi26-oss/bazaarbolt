import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { doc, getDoc, getDocs, collection, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppSettings, CartItem, Address, Product } from "@/types";
import toast from "react-hot-toast";
import { mapSettings, mapProduct } from "@/lib/mappers";

// Step 9: Monitor reads
const logFirestoreRead = (collection: string, count: number) => {
  console.log(`%c[FIRESTORE READ] %c${count} doc(s) from %c${collection}`, "color: #f59e0b; font-weight: bold", "color: #10b981", "color: #3b82f6");
};

interface StoreState {
  settings: AppSettings | null;
  settingsLoading: boolean;
  categories: any[];
  products: Product[];
  catalogLoading: boolean;
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
  initSettings: () => Promise<void>;
  fetchCatalog: (forced?: boolean) => Promise<void>;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      settings: null,
      settingsLoading: true,
      categories: [],
      products: [],
      catalogLoading: true,
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

      initSettings: async () => {
        const { settings } = get();
        if (settings) return; // Fetch only once per session

        set({ settingsLoading: true });
        const settingsRef = doc(db, "settings", "config");
        
        try {
          // Step 2 & 7: Cache-first
          const docSnap = await getDoc(settingsRef);
          logFirestoreRead("settings", 1);
          
          if (docSnap.exists()) {
            const data = mapSettings(docSnap);
            set({ settings: data, settingsLoading: false });
            if (data.primaryColor) {
              document.documentElement.style.setProperty('--primary', data.primaryColor);
            }
          }
        } catch (e) {
          console.error("Settings error:", e);
          set({ settingsLoading: false });
        }
      },

      // Step 2, 3, 8: Centralized catalog fetch with pagination/limit
      fetchCatalog: async (forced = false) => {
        const { products, catalogLoading } = get();
        if (products.length > 0 && !forced) return;
        
        set({ catalogLoading: true });
        try {
          // Fetch Categories
          const catQuery = query(collection(db, "categories"), where("active", "==", true));
          const catSnap = await getDocs(catQuery);
          logFirestoreRead("categories", catSnap.size);
          const cats = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          cats.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

          // Fetch Products (Step 8: Limited query)
          const prodQuery = query(
            collection(db, "products"), 
            where("active", "==", true), 
            limit(100) // Avoid unbounded queries
          );
          const prodSnap = await getDocs(prodQuery);
          logFirestoreRead("products", prodSnap.size);
          
          const prods: Product[] = [];
          prodSnap.forEach(docSnap => {
            const data = docSnap.data();
            if (!data.isDeleted) prods.push(mapProduct(docSnap));
          });

          set({ 
            products: prods, 
            categories: cats, 
            catalogLoading: false 
          });
        } catch (e) {
          console.error("Catalog fetch error:", e);
          set({ catalogLoading: false });
        }
      }
    }),
    {
      name: "bazaarbolt-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        cart: state.cart, 
        selectedAddress: state.selectedAddress,
        products: state.products,
        categories: state.categories
      }),
    }
  )
);
