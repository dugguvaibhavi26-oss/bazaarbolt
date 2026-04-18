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
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

      if (clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        console.error("Firebase Admin Error: Missing FIREBASE_SERVICE_ACCOUNT or individual credentials in environment variables.");
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

// Maintain compatibility for now but use dummy objects if not initialized to prevent crash during top-level analysis
export const adminDb = (typeof window === "undefined" && admin.apps.length > 0) 
  ? admin.firestore() 
  : null as unknown as admin.firestore.Firestore;

export const adminAuth = (typeof window === "undefined" && admin.apps.length > 0) 
  ? admin.auth() 
  : null as unknown as admin.auth.Auth;
