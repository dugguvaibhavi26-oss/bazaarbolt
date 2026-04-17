import { db } from "@/lib/firebase";
import { doc, collection, runTransaction, query, where, getDocs, updateDoc, DocumentSnapshot, DocumentData } from "firebase/firestore";
import { Order } from "@/types";
import { mapOrder } from "@/lib/mappers";
import { orderConverter } from "@/lib/converters";

// Timeout constant: 3 minutes in milliseconds
const ORDER_TIMEOUT_MS = 3 * 60 * 1000;

export const OrderService = {
  
  cancelOrderAndRestoreStock: async (orderId: string) => {
    const orderRef = doc(db, "orders", orderId).withConverter(orderConverter);
    
    await runTransaction(db, async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) throw new Error("Order not found");
      
      const orderData = orderSnap.data();
      if (!orderData) throw new Error("Could not decode order data");
      if (orderData.status !== "PLACED") {
        throw new Error("Order has already been accepted or processed");
      }

      // Read current stock for all items
      const productRefs = orderData.items.map(item => doc(db, "products", item.id));
      const productSnaps: DocumentSnapshot<DocumentData>[] = [];
      for (const ref of productRefs) {
        productSnaps.push(await transaction.get(ref));
      }

      // Restore stock
      orderData.items.forEach((item, index) => {
        const snap = productSnaps[index];
        if (snap.exists()) {
          const data = snap.data();
          const currentStock = Number(data?.stock || 0);
          transaction.update(productRefs[index], { stock: currentStock + item.quantity });
        }
      });

      // Mark order as CANCELLED
      transaction.update(orderRef, { status: "CANCELLED" });
    });
  },

  cleanupExpiredOrders: async () => {
    try {
      const q = query(collection(db, "orders"), where("status", "==", "PLACED"));
      const snapshot = await getDocs(q);
      
      const now = Date.now();
      
      const promises = snapshot.docs.map(async (docSnap) => {
        try {
          const data = mapOrder(docSnap);
          const placedTime = new Date(data.createdAt).getTime();
          
          if (now - placedTime > ORDER_TIMEOUT_MS) {
            console.log(`Auto-cancelling expired order ${docSnap.id}`);
            await OrderService.cancelOrderAndRestoreStock(docSnap.id);
          }
        } catch (e) {
          console.error(`Error processing individual order ${docSnap.id} for cleanup:`, e);
        }
      });

      await Promise.all(promises);
    } catch (error: unknown) {
      console.error("Error running cleanup service:", error instanceof Error ? error.message : "Internal Error");
    }
  }
};
