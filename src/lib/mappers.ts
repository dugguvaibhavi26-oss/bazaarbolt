import { Product, Order, OrderStatus, CartItem, AppSettings } from "@/types";
import { DocumentData, DocumentSnapshot, QuerySnapshot } from "firebase/firestore";

export const mapQuerySnapshot = <T>(
  snapshot: QuerySnapshot<DocumentData>,
  mapper: (doc: DocumentSnapshot<DocumentData>) => T
): T[] => {
  return snapshot.docs.map((doc) => mapper(doc));
};

export const mapProduct = (doc: DocumentSnapshot<DocumentData>): Product => {
  const data = doc.data();
  if (!data) throw new Error(`Product document ${doc.id} is non-existent`);

  // Critical Validation
  if (typeof data.name !== "string" || data.name.trim() === "") throw new Error(`Invalid name for product ${doc.id}`);
  if (typeof data.price !== "number") throw new Error(`Invalid price for product ${doc.id}`);
  if (typeof data.category !== "string") throw new Error(`Invalid category for product ${doc.id}`);
  if (typeof data.stock !== "number") throw new Error(`Invalid stock for product ${doc.id}`);

  return {
    id: doc.id,
    name: data.name,
    price: data.price,
    image: typeof data.image === "string" ? data.image : "",
    category: data.category,
    description: typeof data.description === "string" ? data.description : undefined,
    stock: data.stock,
    active: typeof data.active === "boolean" ? data.active : false,
    isDeleted: typeof data.isDeleted === "boolean" ? data.isDeleted : false,
    section: ["BB", "CAFE"].includes(data.section) ? data.section : "BB",
  };
};

export const mapOrder = (doc: DocumentSnapshot<DocumentData>): Order => {
  const data = doc.data();
  if (!data) throw new Error(`Order document ${doc.id} is non-existent`);

  // Critical Validation
  if (typeof data.userId !== "string") throw new Error(`Invalid userId for order ${doc.id}`);
  if (typeof data.total !== "number") throw new Error(`Invalid total for order ${doc.id}`);
  if (typeof data.status !== "string") throw new Error(`Invalid status for order ${doc.id}`);
  if (!Array.isArray(data.items)) throw new Error(`Invalid items array for order ${doc.id}`);

  return {
    id: doc.id,
    userId: data.userId,
    customerName: typeof data.customerName === "string" ? data.customerName : "Customer",
    items: data.items.map((item: any, idx: number): CartItem => {
      if (!item || typeof item.id !== "string" || typeof item.price !== "number" || typeof item.quantity !== "number") {
        throw new Error(`Invalid item at index ${idx} in order ${doc.id}`);
      }
      return {
        id: item.id,
        name: typeof item.name === "string" ? item.name : "Item",
        price: item.price,
        image: typeof item.image === "string" ? item.image : "",
        category: typeof item.category === "string" ? item.category : "",
        quantity: item.quantity,
        stock: typeof item.stock === "number" ? item.stock : 0,
        unavailable: typeof item.unavailable === "boolean" ? item.unavailable : false,
      };
    }),
    subtotal: typeof data.subtotal === "number" ? data.subtotal : 0,
    tax: typeof data.tax === "number" ? data.tax : 0,
    total: data.total,
    status: (["PLACED", "ACCEPTED", "PICKED", "ON_THE_WAY", "DELIVERED", "CANCELLED"].includes(data.status) ? data.status : "PLACED") as OrderStatus,
    paymentMethod: typeof data.paymentMethod === "string" ? data.paymentMethod : "COD",
    riderId: typeof data.riderId === "string" ? data.riderId : null,
    deliveryCode: typeof data.deliveryCode === "string" ? data.deliveryCode : "",
    deliveryAddress: data.deliveryAddress || "N/A",
    deliveryCharge: typeof data.deliveryCharge === "number" ? data.deliveryCharge : 0,
    deliverySlot: typeof data.deliverySlot === "string" ? data.deliverySlot : undefined,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
    phoneNumber: typeof data.phoneNumber === "string" ? data.phoneNumber : undefined,
  };
};

export const mapSettings = (doc: DocumentSnapshot<DocumentData>): AppSettings => {
  const data = doc.data();
  if (!data) throw new Error("Settings document is empty");

  return {
    storeOpen: typeof data.storeOpen === "boolean" ? data.storeOpen : true,
    bannerImage: typeof data.bannerImage === "string" ? data.bannerImage : "",
    heroBanners: Array.isArray(data.heroBanners) ? data.heroBanners : [],
    announcement: typeof data.announcement === "string" ? data.announcement : "",
    primaryColor: typeof data.primaryColor === "string" ? data.primaryColor : "#22c55e",
    taxPercent: typeof data.taxPercent === "number" ? data.taxPercent : 5,
    handlingCharge: typeof data.handlingCharge === "number" ? data.handlingCharge : 0,
    deliveryFee: typeof data.deliveryFee === "number" ? data.deliveryFee : 0,
    freeDeliveryThreshold: typeof data.freeDeliveryThreshold === "number" ? data.freeDeliveryThreshold : 0,
    smallCartFee: typeof data.smallCartFee === "number" ? data.smallCartFee : 0,
    smallCartThreshold: typeof data.smallCartThreshold === "number" ? data.smallCartThreshold : 0,
    customCharges: Array.isArray(data.customCharges) ? data.customCharges : [],
    codEnabled: typeof data.codEnabled === "boolean" ? data.codEnabled : true,
    coupon: data.coupon ? {
      code: typeof data.coupon.code === "string" ? data.coupon.code : "",
      discount: typeof data.coupon.discount === "number" ? data.coupon.discount : 0,
    } : { code: "", discount: 10 }
  };
};
