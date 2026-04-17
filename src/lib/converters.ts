import { 
  FirestoreDataConverter, 
  QueryDocumentSnapshot, 
  SnapshotOptions,
  DocumentData
} from "firebase/firestore";
import { Product, Order, AppSettings } from "@/types";
import { mapProduct, mapOrder, mapSettings } from "./mappers";

export const productConverter: FirestoreDataConverter<Product> = {
  toFirestore(product: Product): DocumentData {
    return { ...product };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Product {
    return mapProduct(snapshot);
  }
};

export const orderConverter: FirestoreDataConverter<Order> = {
  toFirestore(order: Order): DocumentData {
    return { ...order };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Order {
    return mapOrder(snapshot);
  }
};

export const settingsConverter: FirestoreDataConverter<AppSettings> = {
  toFirestore(settings: AppSettings): DocumentData {
    return { ...settings };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): AppSettings {
    return mapSettings(snapshot);
  }
};
