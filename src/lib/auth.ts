import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  User, 
  browserLocalPersistence, 
  setPersistence 
} from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Capacitor } from "@capacitor/core";
import toast from "react-hot-toast";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * PRODUCTION-SAFE GOOGLE AUTH
 * Detects platform and uses appropriate Firebase flow.
 */
export const signInWithGoogle = async () => {
  try {
    console.log("🛠️ AUTH: Initializing Google Sign-In...");
    await setPersistence(auth, browserLocalPersistence);

    if (Capacitor.isNativePlatform()) {
      console.log("📱 AUTH: Native Platform detected. Using Redirect flow.");
      // Native Redirect Flow
      await signInWithRedirect(auth, googleProvider);
      // Note: The app will now close/redirect to browser.
      // Result handling happens in AuthProvider on app restart.
      return null;
    } else {
      console.log("🌐 AUTH: Web Platform detected. Using Popup flow.");
      // Standard Web Popup
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      if (!user) throw new Error("No user found after popup");
      await syncUserWithFirestore(user);
      toast.success("Welcome, " + user.displayName);
      return user;
    }
  } catch (error: any) {
    console.error("❌ Google Auth Error:", error);
    handleAuthError(error);
    throw error;
  }
};

const handleAuthError = (error: any) => {
  if (error.code === 'auth/popup-closed-by-user') {
    toast.error("Sign-in cancelled.");
  } else if (error.code === 'auth/popup-blocked') {
    toast.error("Popup blocked! Allow popups for this site.");
  } else {
    toast.error(error.message || "Auth error occurred.");
  }
};

/**
 * Ensures the user exists in Firestore and updates their last login
 * strictly following the USER/{UID} pattern.
 */
export const syncUserWithFirestore = async (user: User) => {
  const userRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userRef);

  const userData = {
    uid: user.uid,
    email: user.email,
    name: user.displayName || "Unknown User",
    photoURL: user.photoURL,
    lastLogin: serverTimestamp(),
    updatedAt: serverTimestamp(),
    role: docSnap.exists() ? docSnap.data().role : "customer", // Preserve existing role if any
  };

  if (!docSnap.exists()) {
    // New User: Add createdAt
    await setDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
    });
  } else {
    // Existing User: Merge updates
    await setDoc(userRef, userData, { merge: true });
  }
};
