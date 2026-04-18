import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    // 1. Verify Authorization Header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }
    const idToken = authHeader.split("Bearer ")[1];

    // 2. Verify Firebase ID Token and Check Admin Role
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (e: any) {
      console.error("Token verification failed:", e.message);
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }

    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // 3. Process Bulk Upload
    const { products } = await request.json();

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Invalid products data" }, { status: 400 });
    }

    const productsRef = adminDb.collection("products");

    // Firestore batch limit is 500. We'll use 400 for safety.
    const CHUNK_SIZE = 400;
    const totalProducts = products.length;
    let uploadedCount = 0;

    for (let i = 0; i < totalProducts; i += CHUNK_SIZE) {
      const chunk = products.slice(i, i + CHUNK_SIZE);
      const batch = adminDb.batch();

      chunk.forEach((product) => {
        const newDocRef = productsRef.doc();
        batch.set(newDocRef, {
          ...product,
          createdAt: new Date().toISOString(),
          isDeleted: false,
        });
      });

      await batch.commit();
      uploadedCount += chunk.length;
    }

    return NextResponse.json({ 
      success: true, 
      count: uploadedCount 
    });
  } catch (error: any) {
    console.error("Bulk upload server error:", error);
    
    if (error.message?.includes("credential") || error.message?.includes("key") || error.message?.includes("email")) {
      return NextResponse.json({ 
        error: `Admin SDK Config Error: ${error.message}. Please check your .env.local format and restart your server.` 
      }, { status: 500 });
    }

    return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
  }
}
