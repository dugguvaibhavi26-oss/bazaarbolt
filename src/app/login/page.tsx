"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();

  // If already logged in, redirect to correct portal
  if (!authLoading && user) {
    if (role === "admin") router.push("/admin");
    else if (role === "rider") router.push("/rider");
    else router.push("/profile");
    return null;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    const toastId = toast.loading(isLogin ? "Signing in..." : "Creating account...");

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Identity Verified", { id: toastId });
        // Redirection will be handled by the useEffect or re-render
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCred.user.uid), {
          email: userCred.user.email,
          role: "customer",
          createdAt: new Date().toISOString()
        });
        toast.success("Account created!", { id: toastId });
      }
    } catch (error: unknown) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      const msg = errorMessage.includes("auth/invalid-credential") 
        ? "Invalid email or password" 
        : errorMessage.includes("auth/email-already-in-use")
        ? "Email is already registered"
        : "Authentication failed. Please try again.";
      toast.error(msg, { id: toastId });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-container rounded-full mix-blend-multiply filter blur-[128px] opacity-20 pointer-events-none"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <Link href="/" className="inline-flex items-center justify-center p-4 bg-primary-container/20 border-2 border-primary-container rounded-full mb-6 relative group active:scale-95 transition-transform shadow-lg">
          <span className="material-symbols-outlined text-primary text-4xl group-hover:scale-110 transition-transform" style={{fontVariationSettings: "'FILL' 1"}}>bolt</span>
        </Link>
        <h2 className="text-3xl font-headline font-black text-zinc-900 tracking-tight">
          BazaarBolt
        </h2>
        <p className="mt-2 text-sm font-bold text-zinc-500 tracking-wider uppercase">
           {isLogin ? "Delivering in 10 minutes" : "Join the revolution"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-surface-container-lowest py-8 px-6 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] rounded-3xl sm:px-10 border border-surface-variant">
          <h3 className="font-headline font-extrabold text-xl text-zinc-900 mb-6 tracking-tight text-center">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h3>
          
          <form className="space-y-6" onSubmit={handleAuth}>
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Email address</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-zinc-400 text-lg">mail</span>
                </div>
                <input
                  type="email"
                  required
                  className="appearance-none block w-full pl-11 pr-4 py-3.5 bg-surface-container border border-surface-variant rounded-xl text-zinc-900 font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-white transition-all text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@electric.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Password</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-zinc-400 text-lg">lock</span>
                </div>
                <input
                  type="password"
                  required
                  className="appearance-none block w-full pl-11 pr-4 py-3.5 bg-surface-container border border-surface-variant rounded-xl text-zinc-900 font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-white transition-all text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-[0_8px_16px_-4px_rgba(34,197,94,0.4)] text-sm font-black text-zinc-900 bg-primary hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 active:scale-95 transition-all uppercase tracking-widest"
              >
                {loading ? (
                    <span className="material-symbols-outlined animate-spin font-bold">progress_activity</span>
                ) : (
                    <span>{isLogin ? "Sign In" : "Sign Up"}</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 border-t border-surface-variant/50 pt-6">
            <p className="text-center text-sm font-medium text-zinc-500">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-black text-primary hover:underline hover:text-green-600 transition-colors"
              >
                {isLogin ? "Sign up now" : "Sign in instead"}
              </button>
            </p>
          </div>
        </div>
        
        {/* Minimal Footer */}
        <p className="text-center text-[10px] text-zinc-400 font-medium mt-8 max-w-[250px] mx-auto">
          By continuing, you agree to BazaarBolt's <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
