import * as admin from "firebase-admin";

/**
 * 🔐 FIREBASE ADMIN INITIALIZATION
 * Corrects PEM private key parsing for Vercel/Next.js environments.
 */
if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountVar) {
      console.log("📦 [FirebaseAdmin] Initializing with full Service Account JSON...");
      const serviceAccount = JSON.parse(serviceAccountVar);
      // Ensure the private key inside the JSON is also correctly formatted
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "bazaarbolt-8a1ab";
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (clientEmail && privateKey) {
        console.log("🔑 [FirebaseAdmin] Initializing with individual credentials...");
        
        // 1. CLEANUP: Remove accidental quotes and fix escaped newlines
        // This is the CRITICAL fix for "Invalid PEM formatted message"
        const formattedKey = privateKey
          .replace(/^['"]|['"]$/g, '') // Remove leading/trailing quotes
          .replace(/\\n/g, '\n');      // Convert literal \n to actual newlines

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: formattedKey,
          }),
        });
        console.log("✅ [FirebaseAdmin] Initialized Successfully");
      } else {
        console.warn("⚠️ [FirebaseAdmin] Missing credentials. Admin SDK not initialized.");
      }
    }
  } catch (error: any) {
    console.error("❌ [FirebaseAdmin] Initialization Error:", error.message);
  }
}

export const getAdminDb = () => {
  if (admin.apps.length === 0) throw new Error("Firebase Admin not initialized.");
  return admin.firestore();
};

export const getAdminAuth = () => {
  if (admin.apps.length === 0) throw new Error("Firebase Admin not initialized.");
  return admin.auth();
};

// Proxies for clean server-side usage
export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get: (target, prop) => {
    if (typeof window !== "undefined") return undefined;
    if (admin.apps.length === 0) return undefined;
    return (admin.firestore() as any)[prop];
  }
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get: (target, prop) => {
    if (typeof window !== "undefined") return undefined;
    if (admin.apps.length === 0) return undefined;
    return (admin.auth() as any)[prop];
  }
});
