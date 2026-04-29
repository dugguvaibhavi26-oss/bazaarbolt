"use client"; // deployment trigger

import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  User, 
  signInAnonymously, 
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  getRedirectResult 
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Role } from "@/types";
import { useRouter, usePathname } from "next/navigation";
import toast from "react-hot-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: Role;
  userData: any | null;
  isInitialized: boolean;
  refreshAuth: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: "customer",
  userData: null,
  isInitialized: false,
  refreshAuth: async () => {},
  signInAsGuest: async () => {},
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
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;
    
    const initializeAuth = async () => {
      try {
        console.log("🚀 AUTH START: Initializing...");


        
        // 1. Mandatory Persistence Enforcement
        console.log("🔑 AUTH 1/3: Setting Persistence...");
        await setPersistence(auth, browserLocalPersistence);
        console.log("✅ AUTH 1/3: Persistence locked to LOCAL");

        // 2. Mandatory Redirect Result Capture
        console.log("📡 AUTH 2/3: Checking Redirect Result...");
        const result = await getRedirectResult(auth);
        console.log("📡 AUTH 2/3: Redirect Result capture completed:", result ? "User Found" : "No Result");
        
        if (result && result.user) {
          console.log("👤 AUTH: Redirect user detected:", result.user.uid);
          setUser(result.user);
          // Redirect immediately if on login
          if (pathname === "/login") {
            console.log("🔀 AUTH: Redirecting to dashboard...");
            router.replace("/");
          }
        }

        // 3. Mandatory Auth State Listener
        console.log("👂 AUTH 3/3: Starting State Listener...");
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
          console.log("👤 AUTH: State Changed! Current User:", currentUser?.uid || "NULL");
          console.log("👤 AUTH: Current auth.currentUser from Firebase SDK:", auth.currentUser?.uid || "NULL");
          
          setUser(currentUser);
          
          if (currentUser) {
            const userRef = doc(db, "users", currentUser.uid);
            unsubscribeUserDoc = onSnapshot(userRef, (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                setRole(data.role || "customer");
                console.log("📄 AUTH: Profile loaded for:", currentUser.uid);
              } else {
                setUserData(null);
                setRole("customer");
                console.log("📄 AUTH: No Firestore profile found");
              }
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
      } catch (error) {
        console.error("❌ AUTH FATAL ERROR:", error);
        setLoading(false);
        setIsInitialized(true);
      }
    };

    const cleanupPromise = initializeAuth();

    return () => {
      cleanupPromise.then(unsubscribeAuth => {
        if (unsubscribeAuth) unsubscribeAuth();
      });
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, [router, pathname]);

  // Global Protection: Auto-redirect if user exists and is on login page
  useEffect(() => {
    if (isInitialized && user && pathname === "/login") {
      console.log("🛡️ AUTH GUARD: Blocking Login page, routing to Dashboard");
      router.replace("/");
    }
  }, [isInitialized, user, pathname, router]);

  const refreshAuth = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser(auth.currentUser);
    }
  };

  const signInAsGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Auth: Guest sign-in failed", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Auth: Sign-out failed", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, userData, isInitialized, refreshAuth, signInAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
