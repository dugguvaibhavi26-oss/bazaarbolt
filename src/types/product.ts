export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description?: string;
  stock: number;
  active: boolean;
  isDeleted?: boolean;
}

export interface CartItem extends Omit<Product, 'active' | 'isDeleted'> {
  quantity: number;
}
