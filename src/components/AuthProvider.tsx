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
    
    // Listen for Auth State Changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Real-time listener for User Profile in Firestore
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
        }, (error) => {
          console.error("Firestore Auth Sync Error:", error);
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

    return () => {
      unsubscribeAuth();
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
