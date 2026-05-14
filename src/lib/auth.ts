import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithCredential,
  User, 
  browserLocalPersistence, 
  setPersistence 
} from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import toast from "react-hot-toast";

/**
 * ⚡ BAZAARBOLT NATIVE AUTH v2.0
 * Verified for Android APK Builds
 */

// Initialize Native Google Auth for Capacitor
if (Capacitor.isNativePlatform()) {
  try {
    GoogleAuth.initialize();
    console.log("🚀 AUTH: Native GoogleAuth Initialized");
  } catch (e) {
    console.error("❌ AUTH: Failed to initialize native GoogleAuth", e);
  }
}

/**
 * PRODUCTION-READY NATIVE + WEB GOOGLE AUTH
 * Uses Native plugin on Android/iOS to prevent external Chrome redirects.
 */
export const signInWithGoogle = async () => {
  try {
    console.log("🛠️ AUTH: Starting Google Sign-In Sequence...");
    await setPersistence(auth, browserLocalPersistence);

    if (Capacitor.isNativePlatform()) {
      console.log("📱 AUTH: [NATIVE] Triggering Account Selector...");
      
      // 1. Native Sign-In
      let nativeUser;
      try {
        nativeUser = await GoogleAuth.signIn();
        console.log("✅ AUTH: [NATIVE] User selected account:", nativeUser.email);
      } catch (e: any) {
        if (e.error === 'user_cancelled' || e.code === 'USER_CANCELLED') {
          console.warn("⚠️ AUTH: User cancelled native login");
          toast.error("Sign-in cancelled.");
          return null;
        }
        console.error("❌ AUTH: Native Google Sign-In Error", e);
        throw new Error(`Native Sign-In Failed: ${e.message || 'Check Play Services/SHA fingerprints'}`);
      }

      // 2. Token Verification
      const idToken = nativeUser.authentication.idToken;
      if (!idToken) {
        console.error("❌ AUTH: No ID Token received from Native Plugin");
        throw new Error("Missing ID Token. Ensure serverClientId is the WEB CLIENT ID.");
      }
      console.log("🔑 AUTH: [NATIVE] ID Token received. Swapping for Firebase Credential...");

      // 3. Firebase Token Exchange
      try {
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        const user = result.user;

        if (!user) throw new Error("Firebase result empty after exchange");
        console.log("🔥 AUTH: [NATIVE] Firebase Auth Success:", user.uid);

        // 4. Firestore Sync
        console.log("💾 AUTH: [NATIVE] Syncing with Firestore...");
        await syncUserWithFirestore(user);
        console.log("✨ AUTH: [NATIVE] Firestore Sync Success.");
        
        toast.success("Welcome back, " + (user.displayName || "User"));
        return user;
      } catch (e: any) {
        console.error("❌ AUTH: Firebase Exchange Failed", e);
        throw new Error(`Firebase Auth Failed: ${e.message}`);
      }

    } else {
      // WEB FLOW
      console.log("🌐 AUTH: [WEB] Triggering Popup...");
      const googleProvider = new GoogleAuthProvider();
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (!user) throw new Error("No user found after popup");
      
      await syncUserWithFirestore(user);
      toast.success("Welcome, " + user.displayName);
      return user;
    }
  } catch (error: any) {
    console.error("🚨 CRITICAL AUTH FAILURE:", error);
    toast.error(error.message || "Authentication failed. Try again.");
    throw error;
  }
};

/**
 * Ensures the user exists in Firestore and updates their last login
 */
export const syncUserWithFirestore = async (user: User) => {
  try {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    const userData = {
      uid: user.uid,
      email: user.email,
      name: user.displayName || "Unknown User",
      photoURL: user.photoURL,
      lastLogin: serverTimestamp(),
      updatedAt: serverTimestamp(),
      role: docSnap.exists() ? docSnap.data().role : "customer",
    };

    if (!docSnap.exists()) {
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
      });
    } else {
      await setDoc(userRef, userData, { merge: true });
    }
  } catch (e) {
    console.error("❌ FIRESTORE: Sync Error", e);
    throw new Error("Failed to update user profile in database.");
  }
};
