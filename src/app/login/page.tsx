"use client";

import { useState, useEffect, Suspense } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
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
  const { user, role, loading: authLoading, isInitialized } = useAuth();

  // Redirect if already logged in and profile is complete
  useEffect(() => {
    if (!authLoading && user && !showProfileCompletion && !showServicePopup) {
      if (role === "admin") {
        if (redirectPath.startsWith("/admin")) router.push(redirectPath);
        else router.push("/admin");
      }
      else if (role === "rider") {
        if (redirectPath.startsWith("/rider")) router.push(redirectPath);
        else router.push("/rider");
      }
      else if (role === "vendor") {
        if (redirectPath.startsWith("/vendor")) router.push(redirectPath);
        else router.push("/vendor");
      }
      else {
        if (redirectPath.startsWith("/admin") || redirectPath.startsWith("/vendor") || redirectPath.startsWith("/rider")) {
          router.push("/");
        } else {
          router.push(redirectPath);
        }
      }
    }
  }, [user, role, authLoading, showProfileCompletion, showServicePopup, router, redirectPath]);


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
        toast.success("Identity verified", { id: toastId });
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
        setShowServicePopup(true);
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message || "Authentication failed";
      const msg = errorMessage.includes("auth/invalid-credential") ? "Invalid email or password" : errorMessage.includes("auth/email-already-in-use")
        ? "Email is already registered"
        : "Authentication failed. Please try again.";
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };



  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name || !phoneNumber) {
      toast.error("Name and phone number are required");
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
      setShowServicePopup(true);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to update profile", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const ServicePopup = () => (
    <div className="fixed inset-0 z-[100] bg-zinc-950/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[40px] p-10 shadow-2xl text-center relative overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="absolute top-[-20%] left-[-20%] w-48 h-48 bg-primary rounded-full mix-blend-multiply filter blur-[60px] opacity-10 pointer-events-none"></div>
        <div className="bg-primary/5 rounded-[32px] p-8 flex items-center justify-center mx-auto mb-8 relative border border-primary/10">
           <Logo size="md" />
           <div className="absolute inset-0 bg-primary rounded-[32px] animate-ping opacity-5"></div>
        </div>
        <h2 className="text-3xl font-headline font-black text-zinc-900 tracking-tighter leading-none mb-6">Service area <br /><span className="text-primary text-4xl">Update</span></h2>
        <div className="space-y-4 mb-10">
          <p className="text-sm font-bold text-zinc-500 leading-relaxed tracking-tight">
            BazaarBolt is currently servicing exclusively in <span className="text-zinc-900 font-black">Chevella</span>.
          </p>
          <p className="text-[10px] font-bold text-zinc-400 tracking-widest leading-relaxed">
            Stay tuned! We are expanding rapidly and will be all over soon.
          </p>
        </div>
        <button 
          onClick={() => setShowServicePopup(false)}
          className="w-full bg-zinc-900 text-white py-5 rounded-3xl font-headline font-black tracking-widest text-xs hover:bg-black active:scale-95 transition-all shadow-xl shadow-zinc-200"
        >
          Got it, Bolt!
        </button>
      </div>
    </div>
  );

  if (showServicePopup) return <ServicePopup />;

  if (showProfileCompletion) {
    return (
      <div className="min-h-screen bg-surface flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <h2 className="text-4xl font-headline font-black text-zinc-900 tracking-tighter leading-none">Complete profile</h2>
          <p className="mt-4 text-[10px] font-black text-zinc-400 tracking-[0.2em] leading-none">Just a few more details to bolt</p>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-10 px-8 shadow-2xl rounded-[40px] sm:px-12 border border-zinc-100">
            <form className="space-y-6" onSubmit={handleCompleteProfile}>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1">Full name</label>
                <input
                  type="text"
                  required
                  className="appearance-none block w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Bolt"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1">Phone number</label>
                <input
                  type="tel"
                  required
                  className="appearance-none block w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all text-sm"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 00000 00000"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-16 flex justify-center items-center gap-2 border border-transparent rounded-[20px] shadow-xl text-xs font-black text-zinc-900 bg-primary hover:bg-green-500 focus:outline-none disabled:opacity-50 active:scale-95 transition-all tracking-[0.2em]"
              >
                {loading ? <span className="material-symbols-outlined animate-spin font-bold">progress_activity</span> : "Save profile"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized || authLoading || (user && !showProfileCompletion && !showServicePopup)) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl font-bold">progress_activity</span>
          <p className="text-[10px] font-black tracking-[0.2em] text-zinc-400 uppercase">Securing Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none"></div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <Link href="/" className="inline-flex items-center justify-center w-24 h-24 bg-white border-2 border-zinc-100 rounded-full mb-8 relative group active:scale-95 transition-all shadow-xl overflow-hidden">
          <Logo size="md" className="w-full h-full" />
        </Link>
        <p className="mt-4 text-[10px] font-black text-zinc-400 tracking-[0.3em] leading-none">
          {isLogin ? "Efficiency delivered" : "Join the current"}
        </p>
      </div>

      <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white py-10 px-8 shadow-2xl rounded-[48px] sm:px-12 border border-zinc-100">
          <h2 className="font-headline font-black text-2xl text-zinc-900 mb-8 tracking-tighter text-center leading-none">
            {isLogin ? "Re-Bolt" : "Initiate"}
          </h2>
          <form className="space-y-5" onSubmit={handleAuth}>
            {!isLogin && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1">Full name</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      className="appearance-none block w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all text-sm"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Bolt"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1">Phone number</label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      className="appearance-none block w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all text-sm"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 00000 00000"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1">Email address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  className="appearance-none block w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bolt@electric.io"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-widest text-zinc-400 ml-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  className="appearance-none block w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-16 flex justify-center items-center gap-2 border border-transparent rounded-[20px] shadow-xl text-xs font-black text-zinc-900 bg-primary hover:bg-green-500 focus:outline-none disabled:opacity-50 active:scale-95 transition-all tracking-[0.2em]"
              >
                {loading ? <span className="material-symbols-outlined animate-spin font-bold">progress_activity</span> : <span>{isLogin ? "Sign in" : "Sign up"}</span>}
              </button>
            </div>
          </form>

          <div className="mt-10 border-t border-zinc-100 pt-8">
            <p className="text-center text-[10px] font-black text-zinc-400 tracking-widest leading-none">
              {isLogin ? "NEW TO THE GRID?" : "ALREADY BOLTING?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline hover:text-green-600 transition-colors ml-1 font-black"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
        <p className="text-center text-[8px] text-zinc-300 font-bold mt-10 max-w-[200px] mx-auto tracking-widest leading-relaxed">
          Propelling your lifestyle. ⚡️
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
