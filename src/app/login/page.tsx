"use client";

import { useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";
  const { user, role, loading: authLoading } = useAuth();

  // Redirect if already logged in and profile is complete
  useEffect(() => {
    if (!authLoading && user && !showProfileCompletion) {
      if (role === "admin") router.push("/admin");
      else if (role === "rider") router.push("/rider");
      else router.push(redirectPath);
    }
  }, [user, role, authLoading, showProfileCompletion, router, redirectPath]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    if (!isLogin && (!name || !phoneNumber)) {
      toast.error("Please enter name and phone number");
      return;
    }

    setLoading(true);
    const toastId = toast.loading(isLogin ? "Signing in..." : "Creating account...");

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Identity Verified", { id: toastId });
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCred.user.uid), {
          uid: userCred.user.uid,
          email: userCred.user.email,
          name: name,
          phoneNumber: phoneNumber,
          role: "customer",
          createdAt: new Date().toISOString()
        });
        toast.success("Account created!", { id: toastId });
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message || "Authentication failed";
      const msg = errorMessage.includes("auth/invalid-credential") 
        ? "Invalid email or password" 
        : errorMessage.includes("auth/email-already-in-use")
        ? "Email is already registered"
        : "Authentication failed. Please try again.";
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    const toastId = toast.loading("Connecting Google...");

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (!userDoc.exists() || !userDoc.data()?.phoneNumber || !userDoc.data()?.name) {
        // Need to ask for details
        setShowProfileCompletion(true);
        setName(user.displayName || "");
        toast.success("Welcome! Please complete your profile.", { id: toastId });
      } else {
        toast.success("Signed in with Google", { id: toastId });
        // Redirection will happen in useEffect
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Google sign-in failed", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name || !phoneNumber) {
      toast.error("Name and Phone Number are required");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Saving details...");

    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        name: name,
        phoneNumber: phoneNumber,
        role: "customer",
        createdAt: new Date().toISOString()
      }, { merge: true });

      toast.success("Profile updated!", { id: toastId });
      setShowProfileCompletion(false);
      // Success will trigger redirection in useEffect
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update profile", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (showProfileCompletion) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <h2 className="text-3xl font-headline font-black text-zinc-900 tracking-tight">Complete Profile</h2>
          <p className="mt-2 text-sm font-bold text-zinc-500 uppercase tracking-widest">Just a few more details</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-zinc-100">
            <form className="space-y-6" onSubmit={handleCompleteProfile}>
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="appearance-none block w-full px-4 py-3.5 bg-zinc-50 border border-zinc-100 rounded-xl text-zinc-900 font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  className="appearance-none block w-full px-4 py-3.5 bg-zinc-50 border border-zinc-100 rounded-xl text-zinc-900 font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-sm"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 00000 00000"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-xl text-sm font-black text-zinc-900 bg-primary hover:bg-green-500 focus:outline-none disabled:opacity-50 active:scale-95 transition-all uppercase tracking-widest"
              >
                {loading ? <span className="material-symbols-outlined animate-spin font-bold">progress_activity</span> : "Finish Setup"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-container rounded-full mix-blend-multiply filter blur-[128px] opacity-20 pointer-events-none"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <Link href="/" className="inline-flex items-center justify-center p-4 bg-primary-container/20 border-2 border-primary-container rounded-full mb-6 relative group active:scale-95 transition-transform shadow-lg">
          <span className="material-symbols-outlined text-primary text-4xl group-hover:scale-110 transition-transform" style={{fontVariationSettings: "'FILL' 1"}}>bolt</span>
        </Link>
        <h1 className="text-3xl font-headline font-black text-zinc-900 tracking-tight">
          BazaarBolt
        </h1>
        <p className="mt-2 text-sm font-bold text-zinc-500 tracking-wider uppercase">
           {isLogin ? "Freshness Delivered" : "Join the revolution"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-surface-container-lowest py-8 px-6 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] rounded-3xl sm:px-10 border border-surface-variant">
          <h2 className="font-headline font-extrabold text-xl text-zinc-900 mb-6 tracking-tight text-center">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          
          <form className="space-y-4" onSubmit={handleAuth}>
            {!isLogin && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-zinc-400 text-lg">person</span>
                    </div>
                    <input
                      type="text"
                      required
                      className="appearance-none block w-full pl-11 pr-4 py-3.5 bg-surface-container border border-surface-variant rounded-xl text-zinc-900 font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-white transition-all text-sm"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-zinc-400 text-lg">call</span>
                    </div>
                    <input
                      type="tel"
                      required
                      className="appearance-none block w-full pl-11 pr-4 py-3.5 bg-surface-container border border-surface-variant rounded-xl text-zinc-900 font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary-container focus:bg-white transition-all text-sm"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 00000 00000"
                    />
                  </div>
                </div>
              </>
            )}

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

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-[0_8px_16px_-4px_rgba(34,197,94,0.4)] text-sm font-black text-zinc-900 bg-primary hover:bg-green-500 focus:outline-none disabled:opacity-50 active:scale-95 transition-all uppercase tracking-widest"
              >
                {loading ? <span className="material-symbols-outlined animate-spin font-bold">progress_activity</span> : <span>{isLogin ? "Sign In" : "Sign Up"}</span>}
              </button>
            </div>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-[1px] bg-surface-variant"></div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">or</span>
            <div className="flex-1 h-[1px] bg-surface-variant"></div>
          </div>

          <div className="mt-6">
            <button
               onClick={handleGoogleAuth}
               disabled={loading}
               className="w-full flex justify-center items-center gap-3 py-3.5 px-4 bg-white border border-zinc-200 rounded-xl text-sm font-bold text-zinc-700 hover:bg-zinc-50 transition-all active:scale-95"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

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
        
        <p className="text-center text-[10px] text-zinc-400 font-medium mt-8 max-w-[250px] mx-auto">
          By continuing, you agree to BazaarBolt's <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
