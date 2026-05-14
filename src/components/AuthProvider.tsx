"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  getRedirectResult 
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Role } from "@/types";
import { usePathname } from "next/navigation";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { syncUserWithFirestore } from "@/lib/auth";
import toast from "react-hot-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: Role;
  userData: any | null;
  isInitialized: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: "customer",
  userData: null,
  isInitialized: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  usePushNotifications();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [role, setRole] = useState<Role>("customer");
  const [userData, setUserData] = useState<any | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;
    
    const initAuth = async () => {
      // 1. Enforce Persistence
      await setPersistence(auth, browserLocalPersistence);

      // 2. Handle Redirect Result (For Native & Web Redirects)
      try {
        console.log("📡 AUTH: Checking for redirect result...");
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("✅ AUTH: Redirect user found:", result.user.uid);
          await syncUserWithFirestore(result.user);
          setUser(result.user);
        }
      } catch (error) {
        console.error("❌ AUTH: Redirect Result Error:", error);
      }

      // 3. Capacitor Native URL Listener
      if (Capacitor.isNativePlatform()) {
        console.log("📱 AUTH: Setting up Capacitor App URL Listener...");
        App.addListener('appUrlOpen', async (event: any) => {
          console.log('🔗 AUTH: App opened with URL:', event.url);
          // Standard Firebase Redirect handling
        });
      }

      // 4. Listen for Auth State Changes
      const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
        console.log("👤 AUTH: State Changed:", currentUser?.uid || "NULL");
        setUser(currentUser);
        
        if (currentUser) {
          const userRef = doc(db, "users", currentUser.uid);
          unsubscribeUserDoc = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUserData(data);
              setRole(data.role || "customer");
            } else {
              setUserData(null);
              setRole("customer");
            }
            setLoading(false);
            setIsInitialized(true);
          }, (err) => {
            console.error("Firestore Error:", err);
            setLoading(false);
            setIsInitialized(true);
          });
        } else {
          setUserData(null);
          setRole("customer");
          setLoading(false);
          setIsInitialized(true);
        }
      });

      return unsubscribeAuth;
    };

    const authCleanup = initAuth();

    return () => {
      authCleanup.then(unsub => unsub?.());
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Auth: Sign-out failed", error);
      toast.error("Failed to sign out");
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, userData, isInitialized, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
