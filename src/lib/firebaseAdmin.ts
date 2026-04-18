import * as admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountVar) {
      const serviceAccount = JSON.parse(serviceAccountVar);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "bazaarbolt-8a1ab";
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      // Server-side logging for debugging (safe, doesn't leak secrets)
      if (!clientEmail || !privateKey) {
        console.warn("⚠️ Firebase Admin Environment Variables Missing:", {
          projectId,
          hasEmail: !!clientEmail,
          hasKey: !!privateKey,
        });
      }

      if (clientEmail && privateKey) {
        // Robust formatting for the private key
        const formattedKey = privateKey
          .replace(/^"(.*)"$/, '$1') // Remove surrounding quotes
          .replace(/\\n/g, '\n');    // Convert escaped newlines

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: formattedKey,
          }),
        });
        console.log("✅ Firebase Admin Initialized Successfully");
      }
    }
  } catch (error) {
    console.error("❌ Firebase admin initialization error:", error);
  }
}

export const getAdminDb = () => {
  if (admin.apps.length === 0) {
    throw new Error("Firebase Admin not initialized. Check your environment variables.");
  }
  return admin.firestore();
};

export const getAdminAuth = () => {
  if (admin.apps.length === 0) {
    throw new Error("Firebase Admin not initialized. Check your environment variables.");
  }
  return admin.auth();
};

// Better pattern for Next.js to avoid build-time crashes but work at runtime
export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get: (target, prop) => {
    if (typeof window !== "undefined") return undefined;
    if (admin.apps.length === 0) {
        // If we are in build time analysis, don't throw yet
        if (process.env.NEXT_PHASE === 'phase-production-build') return undefined;
        throw new Error("Firebase Admin SDK not initialized. Check your environment variables.");
    }
    return (admin.firestore() as any)[prop];
  }
});

export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get: (target, prop) => {
    if (typeof window !== "undefined") return undefined;
    if (admin.apps.length === 0) {
        if (process.env.NEXT_PHASE === 'phase-production-build') return undefined;
        throw new Error("Firebase Admin SDK not initialized. Check your environment variables.");
    }
    return (admin.auth() as any)[prop];
  }
});
