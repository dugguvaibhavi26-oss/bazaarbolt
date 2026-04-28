export * from "./product";
export * from "./order";

export type Role = "customer" | "admin" | "rider" | "vendor";

export interface HeroBanner {
  url: string;
  section: "BB" | "CAFE";
  title?: string;
  subtitle?: string;
  redirectUrl?: string;
}

export interface AppSettings {
  storeOpen: boolean;
  bannerImage: string;
  heroBanners?: HeroBanner[];
  announcement: string;
  primaryColor: string;
  taxPercent: number;
  handlingCharge: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  smallCartFee: number;
  smallCartThreshold: number;
  customCharges: { label: string; amount: number }[];
  codEnabled: boolean;
  coupon: {
    code: string;
    discount: number;
  };
  notificationTemplates?: {
    [key: string]: {
      title: string;
      body: string;
    }
  };
  promoSections?: PromoSection[];
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  pincode: string;
  landmark?: string;
}

export interface PromoSectionItem {
  imageUrl: string;
  redirectUrl?: string;
  label?: string;
  colSpan?: number;
  rowSpan?: number;
}

export interface PromoSection {
  id: string;
  type: "banner" | "grid" | "deal_row" | "sliding_row";
  section: "BB" | "CAFE";
  position?: "TOP" | "MIDDLE" | "BOTTOM" | "AFTER_HERO" | "AFTER_CATEGORIES" | "AFTER_BESTSELLERS" | "AFTER_NEW_ARRIVALS" | string;
  title?: string;
  subtitle?: string;
  bgColor?: string;
  textColor?: string;
  bgImageUrl?: string;
  bgAnimation?: "none" | "parallax" | "zoom";
  isCompact?: boolean;
  items: PromoSectionItem[];
  
  // Banner specific
  buttonText?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  
  // Deal Row & Sliding Row specific
  priceLimit?: number;
  manualProductIds?: string[];
  sideBannerImageUrl?: string;
  afterCategoryId?: string;
  iconUrl?: string;
  filterCategoryId?: string;
  filterSubcategory?: string;
}
