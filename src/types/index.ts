export * from "./product";
export * from "./order";

export type Role = "customer" | "admin" | "rider";

export interface HeroBanner {
  url: string;
  section: "BB" | "CAFE";
  title?: string;
  subtitle?: string;
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
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  pincode: string;
  landmark?: string;
}
