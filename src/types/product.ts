export interface Product {
  id: string;
  name: string;
  price: number;
  mrp: number;
  image: string;
  category: string;
  description?: string;
  stock: number;
  active: boolean;
  adminActive: boolean;
  vendorAvailable: boolean;
  vendorId?: string;
  lastUpdatedBy?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  createdAt?: string;
  section?: "BB" | "CAFE";
  subcategory?: string;
  rating?: number;
  ratingCount?: number;
  isBestseller?: boolean;
}

export interface CartItem extends Omit<Product, 'active' | 'isDeleted'> {
  quantity: number;
  unavailable?: boolean;
}
