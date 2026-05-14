"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { signInWithGoogle } from "@/lib/auth";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); // 0: Login, 1: Name, 2: Phone, 3: Address
  const [onboardingData, setOnboardingData] = useState({
    name: "",
    phoneNumber: "",
    address: ""
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";
  const { user, isInitialized, userData, loading: authLoading } = useAuth();

  // Detect if user needs onboarding
  useEffect(() => {
    if (isInitialized && user && userData) {
      const needsOnboarding = !userData.phoneNumber || !userData.address;
      if (!needsOnboarding && step === 0) {
        router.replace(redirectPath);
      } else if (needsOnboarding && step === 0) {
        setStep(1);
        setOnboardingData({
          name: userData.name || user.displayName || "",
          phoneNumber: userData.phoneNumber || "",
          address: userData.address || ""
        });
      }
    }
  }, [user, isInitialized, userData, router, redirectPath, step]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // Onboarding detection happens in useEffect above
    } catch (error) {
      console.error("Login Page Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        ...onboardingData,
        onboardingComplete: true,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      toast.success("Profile complete! Welcome aboard.");
      router.replace(redirectPath);
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized || authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-[10px] font-black tracking-[0.2em] text-emerald-500 uppercase">Verifying Session...</p>
        </div>
      </div>
    );
  }

  // Animation variants
  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 }
  };

  return (
    <div className="min-h-screen bg-emerald-50/30 flex flex-col justify-center items-center py-12 px-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-emerald-200/40 rounded-full blur-[80px]" />
      <div className="absolute bottom-[-5%] left-[-5%] w-72 h-72 bg-emerald-100/30 rounded-full blur-[60px]" />
      
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div 
            key="login"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full max-w-md z-10"
          >
            <div className="flex flex-col items-center text-center mb-10">
              <h1 className="text-5xl font-headline font-black text-zinc-900 tracking-tighter leading-none">
                Bazaar<span className="text-emerald-500">Bolt</span>
              </h1>
            </div>

            <div className="bg-white p-10 rounded-[48px] shadow-2xl shadow-emerald-900/5 border border-white">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-zinc-900 mb-2">Welcome Back!</h2>
                <p className="text-xs text-zinc-500 leading-relaxed">Sign in with Google to access your fresh groceries and daily essentials.</p>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="relative w-full h-14 bg-zinc-900 text-white rounded-2xl flex items-center justify-center gap-4 transition-all hover:bg-black active:scale-95 disabled:opacity-50 shadow-xl shadow-zinc-200"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <div className="bg-white p-1 rounded-md">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    </div>
                    <span className="text-xs font-black tracking-widest uppercase">Continue with Google</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div 
            key="name"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full max-w-md z-10"
          >
            <div className="bg-white p-10 rounded-[48px] shadow-2xl border border-white">
              <div className="mb-8">
                <div className="w-12 h-1 bg-emerald-500 rounded-full mb-6" />
                <h2 className="text-3xl font-headline font-black text-zinc-900 tracking-tighter leading-none mb-2">Your Name</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Step 1 of 3</p>
              </div>
              <input 
                autoFocus
                type="text" 
                value={onboardingData.name}
                onChange={(e) => setOnboardingData({...onboardingData, name: e.target.value})}
                placeholder="Enter full name"
                className="w-full px-6 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm mb-6"
              />
              <button 
                onClick={() => onboardingData.name.length > 2 ? setStep(2) : toast.error("Please enter your name")}
                className="w-full h-14 bg-emerald-500 text-white rounded-2xl font-black text-xs tracking-widest uppercase shadow-xl shadow-emerald-200 active:scale-95 transition-all"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="phone"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full max-w-md z-10"
          >
            <div className="bg-white p-10 rounded-[48px] shadow-2xl border border-white">
              <div className="mb-8">
                <div className="flex gap-1 mb-6">
                  <div className="w-6 h-1 bg-emerald-200 rounded-full" />
                  <div className="w-12 h-1 bg-emerald-500 rounded-full" />
                </div>
                <h2 className="text-3xl font-headline font-black text-zinc-900 tracking-tighter leading-none mb-2">Phone Number</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Step 2 of 3</p>
              </div>
              <input 
                autoFocus
                type="tel" 
                value={onboardingData.phoneNumber}
                onChange={(e) => setOnboardingData({...onboardingData, phoneNumber: e.target.value})}
                placeholder="+91 00000 00000"
                className="w-full px-6 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm mb-6"
              />
              <button 
                onClick={() => onboardingData.phoneNumber.length > 9 ? setStep(3) : toast.error("Enter a valid phone number")}
                className="w-full h-14 bg-emerald-500 text-white rounded-2xl font-black text-xs tracking-widest uppercase shadow-xl shadow-emerald-200 active:scale-95 transition-all"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="address"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full max-w-md z-10"
          >
            <div className="bg-white p-10 rounded-[48px] shadow-2xl border border-white">
              <div className="mb-8">
                <div className="flex gap-1 mb-6">
                  <div className="w-6 h-1 bg-emerald-200 rounded-full" />
                  <div className="w-6 h-1 bg-emerald-200 rounded-full" />
                  <div className="w-12 h-1 bg-emerald-500 rounded-full" />
                </div>
                <h2 className="text-3xl font-headline font-black text-zinc-900 tracking-tighter leading-none mb-2">Delivery Address</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Final Step</p>
              </div>
              <textarea 
                autoFocus
                value={onboardingData.address}
                onChange={(e) => setOnboardingData({...onboardingData, address: e.target.value})}
                placeholder="House no, Street, Landmark..."
                rows={3}
                className="w-full px-6 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-zinc-900 font-bold placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm mb-6 resize-none"
              />
              <button 
                disabled={loading}
                onClick={handleOnboardingSubmit}
                className="w-full h-16 bg-zinc-900 text-white rounded-[24px] font-black text-xs tracking-[0.2em] uppercase shadow-xl shadow-zinc-200 active:scale-95 transition-all flex items-center justify-center"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "Complete Setup"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-10 text-center text-[9px] text-zinc-300 font-bold tracking-[0.2em] leading-relaxed uppercase z-10">
        BazaarBolt <span className="text-zinc-400">Onboarding Grid</span>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
