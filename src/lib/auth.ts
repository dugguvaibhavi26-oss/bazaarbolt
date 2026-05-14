import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  User, 
  browserLocalPersistence, 
  setPersistence 
} from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const signInWithGoogle = async () => {
  try {
    // 1. Ensure persistence is set to LOCAL
    await setPersistence(auth, browserLocalPersistence);

    // 2. Trigger Google Popup
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    if (!user) throw new Error("Authentication failed: No user found");

    // 3. Verify & Save to Firestore
    await syncUserWithFirestore(user);

    toast.success("Welcome, " + user.displayName);
    return user;
  } catch (error: any) {
    console.error("Google Auth Error:", error);

    // Handle specific Firebase errors
    if (error.code === 'auth/popup-closed-by-user') {
      toast.error("Sign-in cancelled. Please try again.");
    } else if (error.code === 'auth/blocked-at-idp') {
      toast.error("Sign-in blocked by Google. Check your settings.");
    } else if (error.code === 'auth/popup-blocked') {
      toast.error("Popup blocked! Please allow popups for this site.");
    } else {
      toast.error(error.message || "An unexpected error occurred during sign-in.");
    }
    
    throw error;
  }
};

/**
 * Ensures the user exists in Firestore and updates their last login
 * strictly following the USER/{UID} pattern.
 */
const syncUserWithFirestore = async (user: User) => {
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
