import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  console.log("📥 [BulkUpload] Received request");
  
  try {
    // 1. Verify Authorization Header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn("⚠️ [BulkUpload] Missing or invalid auth header");
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }
    const idToken = authHeader.split("Bearer ")[1];

    // 2. Verify Firebase ID Token
    let decodedToken;
    try {
      console.log("🔍 [BulkUpload] Verifying ID token...");
      decodedToken = await adminAuth.verifyIdToken(idToken);
      console.log(`✅ [BulkUpload] Token verified for UID: ${decodedToken.uid}`);
    } catch (e: any) {
      console.error("❌ [BulkUpload] Token verification failed:", e.message);
      // Detailed error if it's a configuration issue
      if (e.message?.includes("routines::unsupported") || e.message?.includes("metadata")) {
        return NextResponse.json({ 
          error: "Auth Configuration Error: The server's Firebase Private Key is invalid or malformed for OpenSSL 3. Check your .env.local formatting." 
        }, { status: 500 });
      }
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }

    // 3. Check Admin Role
    try {
      console.log(`🔍 [BulkUpload] Checking admin role for ${decodedToken.uid}...`);
      const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
      if (!userDoc.exists || userDoc.data()?.role !== "admin") {
        console.warn(`⚠️ [BulkUpload] User ${decodedToken.uid} is not an admin`);
        return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
      }
      console.log("✅ [BulkUpload] Admin access confirmed");
    } catch (e: any) {
      console.error("❌ [BulkUpload] Firestore role check failed:", e.message);
      if (e.message?.includes("routines::unsupported") || e.message?.includes("metadata")) {
        return NextResponse.json({ 
          error: "Firestore Configuration Error: The server's Firebase Private Key is invalid or malformed for OpenSSL 3." 
        }, { status: 500 });
      }
      return NextResponse.json({ error: `Server Error: ${e.message}` }, { status: 500 });
    }

    // 4. Process Bulk Upload
    let products;
    try {
      const body = await request.json();
      products = body.products;
    } catch (e) {
      console.error("❌ [BulkUpload] Failed to parse request JSON");
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    if (!Array.isArray(products) || products.length === 0) {
      console.warn("⚠️ [BulkUpload] Empty or invalid products array received");
      return NextResponse.json({ error: "Invalid products data" }, { status: 400 });
    }

    console.log(`📦 [BulkUpload] Starting upload of ${products.length} products...`);

    const productsRef = adminDb.collection("products");
    const CHUNK_SIZE = 400;
    let uploadedCount = 0;

    for (let i = 0; i < products.length; i += CHUNK_SIZE) {
      const chunk = products.slice(i, i + CHUNK_SIZE);
      const batch = adminDb.batch();
      console.log(`⏳ [BulkUpload] Processing batch ${Math.floor(i / CHUNK_SIZE) + 1}...`);

      chunk.forEach((product) => {
        if (product.id) {
          const docRef = productsRef.doc(product.id);
          const data = { ...product };
          delete (data as any).id;
          batch.set(docRef, {
            ...data,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } else {
          const newDocRef = productsRef.doc();
          batch.set(newDocRef, {
            ...product,
            createdAt: new Date().toISOString(),
            isDeleted: false,
          });
        }
      });

      try {
        await batch.commit();
        uploadedCount += chunk.length;
        console.log(`✅ [BulkUpload] Batch ${Math.floor(i / CHUNK_SIZE) + 1} committed (${uploadedCount}/${products.length})`);
      } catch (e: any) {
        console.error(`❌ [BulkUpload] Batch commit failed:`, e.message);
        throw e;
      }
    }

    console.log("🎉 [BulkUpload] Bulk upload completed successfully");
    return NextResponse.json({ 
      success: true, 
      count: uploadedCount 
    });

  } catch (error: any) {
    console.error("💥 [BulkUpload] Critical server error:", error);
    
    // Final fallback for the specific DECODER error
    if (error.message?.includes("routines::unsupported") || error.message?.includes("metadata")) {
      return NextResponse.json({ 
        error: `Deployment Config Error: The Firebase Private Key is incompatible with the server's OpenSSL version. Please check .env.local. Original error: ${error.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
  }
}
