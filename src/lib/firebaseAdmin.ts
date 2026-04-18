import * as admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccountVar) {
      // Parse the JSON string from the environment variable
      const serviceAccount = JSON.parse(serviceAccountVar);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Fallback for individual variables if the JSON block is missing
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "bazaarbolt-8a1ab";
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (privateKey) {
        // Handle escaped newlines and remove surrounding quotes if they exist
        privateKey = privateKey.replace(/\\n/g, "\n").replace(/^"(.*)"$/, "$1");
      }

      if (clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        console.error("Firebase Admin Error: Missing credentials.", {
            hasEmail: !!clientEmail,
            hasKey: !!privateKey,
            projectId
        });
      }
    }
  } catch (error) {
    console.error("Firebase admin initialization error", error);
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
