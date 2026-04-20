"use client";

import { useState, useEffect, Suspense } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Logo } from "@/components/Logo";

function LoginContent() {
  const [isLogin, setIsLogin] = useState(true);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [showServicePopup, setShowServicePopup] = useState(false);
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
    if (!authLoading && user && !showProfileCompletion && !showServicePopup) {
      if (role === "admin") router.push("/admin");
      else if (role === "rider") router.push("/rider");
      else router.push(redirectPath);
    }
  }, [user, role, authLoading, showProfileCompletion, showServicePopup, router, redirectPath]);

  // Handle Google Auth Redirect Results (if popup failed previously)
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const user = result.user;
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (!userDoc.exists() || !userDoc.data()?.phoneNumber || !userDoc.data()?.name) {
            setShowProfileCompletion(true);
            setName(user.displayName || "");
            toast.success("WELCOME! PLEASE COMPLETE YOUR PROFILE.");
          } else {
            toast.success("SIGNED IN WITH GOOGLE");
          }
        }
      } catch (error: any) {
        console.error("Redirect Error:", error);
        toast.error("GOOGLE SIGN-IN FAILED. PLEASE TRY AGAIN.");
      }
    };
    handleRedirectResult();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("PLEASE ENTER EMAIL AND PASSWORD");
      return;
    }

    if (!isLogin && (!name || !phoneNumber)) {
      toast.error("PLEASE ENTER NAME AND PHONE NUMBER");
      return;
    }

    setLoading(true);
    const toastId = toast.loading(isLogin ? "SIGNING IN..." : "CREATING ACCOUNT...");

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("IDENTITY VERIFIED", { id: toastId });
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
        toast.success("ACCOUNT CREATED!", { id: toastId });
        setShowServicePopup(true);
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message || "AUTHENTICATION FAILED";
      const msg = errorMessage.includes("auth/invalid-credential") ? "INVALID EMAIL OR PASSWORD" : errorMessage.includes("auth/email-already-in-use")
        ? "EMAIL IS ALREADY REGISTERED"
        : "AUTHENTICATION FAILED. PLEASE TRY AGAIN.";
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const toastId = toast.loading("CONNECTING GOOGLE...");

    try {
      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupError: any) {
        if (
          popupError.code === 'auth/popup-blocked' || 
          popupError.code === 'auth/cancelled-popup-request' ||
          popupError.code === 'auth/popup-closed-by-user' ||
          popupError.code === 'auth/cross-origin-opener-policy-failure' ||
          popupError.message?.includes('Cross-Origin-Opener-Policy')
        ) {
          toast.loading("REDIRECTING TO SECURE LOGIN...", { id: toastId });
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupError;
      }

      const user = result.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists() || !userDoc.data()?.phoneNumber || !userDoc.data()?.name) {
        setShowProfileCompletion(true);
        setName(user.displayName || "");
        toast.success("WELCOME! PLEASE COMPLETE YOUR PROFILE.", { id: toastId });
      } else {
        toast.success("SIGNED IN WITH GOOGLE", { id: toastId });
      }
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      toast.error(error.message || "GOOGLE SIGN-IN FAILED", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name || !phoneNumber) {
      toast.error("NAME AND PHONE NUMBER ARE REQUIRED");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("SAVING DETAILS...");

    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        name: name,
        phoneNumber: phoneNumber,
        role: "customer",
        createdAt: new Date().toISOString()
      }, { merge: true });

      toast.success("PROFILE UPDATED!", { id: toastId });
      setShowProfileCompletion(false);
      setShowServicePopup(true);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "FAILED TO UPDATE PROFILE", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const ServicePopup = () => (
    <div className="fixed inset-0 z-[100] bg-zinc-950/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[40px] p-10 shadow-2xl text-center relative overflow-hidden animate-in zoom-in-95 duration-500 uppercase">
        <div className="absolute top-[-20%] left-[-20%] w-48 h-48 bg-primary rounded-full mix-blend-multiply filter blur-[60px] opacity-10 pointer-events-none uppercase"></div>
        <div className="bg-primary/5 rounded-[32px] p-8 flex items-center justify-center mx-auto mb-8 relative border border-primary/10 uppercase">
           <Logo size="md" />
           <div className="absolute inset-0 bg-primary rounded-[32px] animate-ping opacity-5 uppercase"></div>
        </div>
        <h2 className="text-3xl font-headline font-black text-zinc-900 tracking-tighter leading-none mb-6 uppercase">Service Area <br /><span className="text-primary text-4xl uppercase">Update</span></h2>
        <div className="space-y-4 mb-10 uppercase">
          <p className="text-sm font-bold text-zinc-500 leading-relaxed uppercase tracking-tight">
            BazaarBolt is currently servicing exclusively in <span className="text-zinc-900 font-black uppercase">Chevella</span>.
          </p>
          <p className="text-[10px] font-bold text-zinc-400 tracking-widest leading-relaxed uppercase">
            Stay tuned! We are expanding rapidly and will be all over soon.
          </p>
        </div>
        <button 
          onClick={() => setShowServicePopup(false)}
          className="w-full bg-zinc-900 text-white py-5 rounded-3xl font-headline font-black tracking-widest text-xs hover:bg-black active:scale-95 transition-all shadow-xl shadow-zinc-200 uppercase"
        >
          Got it, Bolt!
        </button>
      </div>
    </div>
  );

  if (showServicePopup) return <ServicePopup />;

  if (showProfileCompletion) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 uppercase">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center uppercase">
          <h2 className="text-4xl font-headline font-black text-zinc-900 tracking-tighter leading-none uppercase">Complete Profile</h2>
          <p className="mt-4 text-[10px] font-black text-zinc-400 tracking-[0.2em] uppercase leading-none">Just a few more details to bolt</p>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md uppercase">
          <div className="bg-white py-10 px-8 shadow-2xl rounded-[40px] sm:px-12 border border-zinc-100 uppercase">
            <form className="space-y-6 uppercase" onSubmit={handleCompleteProfile}>
              <div className="space-y-1.5 uppercase">
                <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  className="appearance-none block w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all text-sm uppercase placeholder:uppercase"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.G. JOHN BOLT"
                />
              </div>

              <div className="space-y-1.5 uppercase">
                <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 uppercase">Phone Number</label>
                <input
                  type="tel"
                  required
                  className="appearance-none block w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all text-sm uppercase"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 00000 00000"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-16 flex justify-center items-center gap-2 border border-transparent rounded-[20px] shadow-xl text-xs font-black text-zinc-900 bg-primary hover:bg-green-500 focus:outline-none disabled:opacity-50 active:scale-95 transition-all tracking-[0.2em] uppercase"
              >
                {loading ? <span className="material-symbols-outlined animate-spin font-bold uppercase">progress_activity</span> : "Propagate Profile"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden uppercase">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none uppercase"></div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 uppercase">
        <Link href="/" className="inline-flex items-center justify-center w-24 h-24 bg-white border-2 border-zinc-100 rounded-full mb-8 relative group active:scale-95 transition-all shadow-xl overflow-hidden uppercase">
          <Logo size="md" className="w-full h-full" />
        </Link>
        <p className="mt-4 text-[10px] font-black text-zinc-400 tracking-[0.3em] uppercase leading-none">
          {isLogin ? "Efficiency Delivered" : "Join the current"}
        </p>
      </div>

      <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-md z-10 uppercase">
        <div className="bg-white py-10 px-8 shadow-2xl rounded-[48px] sm:px-12 border border-zinc-100 uppercase">
          <h2 className="font-headline font-black text-2xl text-zinc-900 mb-8 tracking-tighter text-center uppercase leading-none">
            {isLogin ? "Re-Bolt" : "Initiate"}
          </h2>
          <form className="space-y-5 uppercase" onSubmit={handleAuth}>
            {!isLogin && (
              <>
                <div className="space-y-1.5 uppercase">
                  <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 uppercase">Full Name</label>
                  <div className="relative uppercase">
                    <input
                      type="text"
                      required
                      className="appearance-none block w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all text-sm uppercase placeholder:uppercase"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Bolt"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 uppercase">
                  <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 uppercase">Phone Number</label>
                  <div className="relative uppercase">
                    <input
                      type="tel"
                      required
                      className="appearance-none block w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all text-sm uppercase"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 00000 00000"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5 uppercase">
              <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 uppercase">Email address</label>
              <div className="relative uppercase">
                <input
                  type="email"
                  required
                  className="appearance-none block w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all text-sm uppercase placeholder:uppercase"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="BOLT@ELECTRIC.IO"
                />
              </div>
            </div>

            <div className="space-y-1.5 uppercase">
              <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1 uppercase">Password</label>
              <div className="relative uppercase">
                <input
                  type="password"
                  required
                  className="appearance-none block w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all text-sm uppercase"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-4 uppercase">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-16 flex justify-center items-center gap-2 border border-transparent rounded-[20px] shadow-xl text-xs font-black text-zinc-900 bg-primary hover:bg-green-500 focus:outline-none disabled:opacity-50 active:scale-95 transition-all tracking-[0.2em] uppercase"
              >
                {loading ? <span className="material-symbols-outlined animate-spin font-bold uppercase">progress_activity</span> : <span>{isLogin ? "Sign In" : "Sign Up"}</span>}
              </button>
            </div>
          </form>

          <div className="mt-8 flex items-center gap-4 uppercase">
            <div className="flex-1 h-[1px] bg-zinc-100 uppercase"></div>
            <span className="text-[9px] font-black text-zinc-300 tracking-[0.3em] uppercase">Bolt with</span>
            <div className="flex-1 h-[1px] bg-zinc-100 uppercase"></div>
          </div>

          <div className="mt-8 uppercase">
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full h-14 flex justify-center items-center gap-3 bg-white border border-zinc-100 rounded-2xl text-[10px] font-black text-zinc-600 hover:bg-zinc-50 transition-all active:scale-95 shadow-sm uppercase tracking-widest"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Google Identity</span>
            </button>
          </div>

          <div className="mt-10 border-t border-zinc-100 pt-8 uppercase">
            <p className="text-center text-[10px] font-black text-zinc-400 tracking-widest uppercase leading-none">
              {isLogin ? "NEW TO THE GRID?" : "ALREADY BOLTING?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline hover:text-green-600 transition-colors ml-1 uppercase font-black"
              >
                {isLogin ? "SIGN UP" : "SIGN IN"}
              </button>
            </p>
          </div>
        </div>
        <p className="text-center text-[8px] text-zinc-300 font-bold mt-10 max-w-[200px] mx-auto uppercase tracking-widest leading-relaxed">
          Propelling your lifestyle. ⚡️
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center uppercase">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl uppercase">progress_activity</span>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
