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
    mrp: typeof data.mrp === "number" ? data.mrp : data.price,
    image: typeof data.image === "string" ? data.image : "",
    category: data.category,
    description: typeof data.description === "string" ? data.description : undefined,
    stock: data.stock,
    active: typeof data.active === "boolean" ? data.active : false,
    adminActive: typeof data.adminActive === "boolean" ? data.adminActive : (typeof data.active === "boolean" ? data.active : true),
    vendorAvailable: typeof data.vendorAvailable === "boolean" ? data.vendorAvailable : true,
    vendorId: typeof data.vendorId === "string" ? data.vendorId : undefined,
    lastUpdatedBy: typeof data.lastUpdatedBy === "string" ? data.lastUpdatedBy : undefined,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
    isDeleted: typeof data.isDeleted === "boolean" ? data.isDeleted : false,
    section: ["BB", "CAFE"].includes(data.section) ? data.section : "BB",
    rating: typeof data.rating === "number" ? data.rating : 0,
    ratingCount: typeof data.ratingCount === "number" ? data.ratingCount : 0,
    isBestseller: typeof data.isBestseller === "boolean" ? data.isBestseller : false,
  };
};

export const mapOrder = (doc: DocumentSnapshot<DocumentData>): Order => {
  const data = doc.data();
  if (!data) throw new Error(`Order document ${doc.id} is non-existent`);

  // Robust parsing: Don't throw if one or two fields are slightly off, use defaults
  const items = Array.isArray(data.items) ? data.items.map((item: any, idx: number): CartItem => {
    return {
      id: typeof item.id === "string" ? item.id : `item-${idx}`,
      name: typeof item.name === "string" ? item.name : "Item",
      price: typeof item.price === "number" ? item.price : 0,
      image: typeof item.image === "string" ? item.image : "",
      category: typeof item.category === "string" ? item.category : "",
      quantity: typeof item.quantity === "number" ? item.quantity : 1,
      stock: typeof item.stock === "number" ? item.stock : 0,
      unavailable: typeof item.unavailable === "boolean" ? item.unavailable : false,
    };
  }) : [];

  return {
    id: doc.id,
    userId: typeof data.userId === "string" ? data.userId : "unknown",
    customerName: typeof data.customerName === "string" ? data.customerName : "Customer",
    items,
    subtotal: typeof data.subtotal === "number" ? data.subtotal : 0,
    tax: typeof data.tax === "number" ? data.tax : 0,
    total: typeof data.total === "number" ? data.total : 0,
    status: (["PLACED", "ACCEPTED", "PICKED", "ON_THE_WAY", "DELIVERED", "CANCELLED"].includes(data.status) ? data.status : "PLACED") as OrderStatus,
    paymentMethod: typeof data.paymentMethod === "string" ? data.paymentMethod : "COD",
    riderId: typeof data.riderId === "string" ? data.riderId : null,
    deliveryCode: typeof data.deliveryCode === "string" ? data.deliveryCode : "",
    deliveryAddress: data.deliveryAddress || "N/A",
    deliveryCharge: typeof data.deliveryCharge === "number" ? data.deliveryCharge : 0,
    deliverySlot: typeof data.deliverySlot === "string" ? data.deliverySlot : undefined,
    deliveryDate: typeof data.deliveryDate === "string" ? data.deliveryDate : undefined,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
    phoneNumber: typeof data.phoneNumber === "string" ? data.phoneNumber : undefined,
    rated: typeof data.rated === "boolean" ? data.rated : undefined,
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
    } : { code: "", discount: 10 },
    notificationTemplates: data.notificationTemplates || {}
  };
};
