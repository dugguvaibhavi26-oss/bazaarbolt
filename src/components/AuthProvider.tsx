"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  User, 
  signInAnonymously, 
  signOut as firebaseSignOut 
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: "customer" | "admin" | "rider";
  userData: any | null;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: "customer",
  userData: null,
  signInAsGuest: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  usePushNotifications();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"customer" | "admin" | "rider">("customer");
  const [userData, setUserData] = useState<any | null>(null);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Use onSnapshot for real-time profile updates
        const userRef = doc(db, "users", currentUser.uid);
        
        unsubscribeUserDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            setRole(data.role || "customer");
          } else {
            // Document might not exist yet (during signup)
            setUserData(null);
            setRole("customer");
          }
          setLoading(false);
        });
      } else {
        setUserData(null);
        setRole("customer");
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

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
    <AuthContext.Provider value={{ user, loading, role, userData, signInAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
