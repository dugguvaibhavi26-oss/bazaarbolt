import { CartItem } from "./product";

export type OrderStatus = "PLACED" | "ACCEPTED" | "PICKED" | "ON_THE_WAY" | "DELIVERED" | "CANCELLED";

export interface Order {
  id?: string;
  userId: string;
  customerName?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  riderId: string | null;
  deliveryCode: string;
  deliveryAddress: any; // Can be string or Address object
  deliveryCharge: number;
  deliverySlot?: string;
  createdAt: string;
  phoneNumber?: string;
  rated?: boolean;
}
