"use client";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { sendEmailVerification } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import toast from "react-hot-toast";
import { Logo } from "@/components/Logo";

export default function VerifyEmailPage() {
  const { user, emailVerified, loading, refreshAuth } = useAuth();
  const router = useRouter();
  const [cooldown, setCooldown] = useState(0);
  const [checking, setChecking] = useState(false);

  // Redirect if already verified
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (user.isAnonymous || emailVerified) {
        router.replace("/");
      }
    }
  }, [user, emailVerified, loading, router]);

  // Polling for verification status
  useEffect(() => {
    if (!user || emailVerified) return;

    const interval = setInterval(async () => {
      try {
        await refreshAuth();
        if (auth.currentUser?.emailVerified) {
          toast.success("Email verified successfully!");
          router.replace("/");
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, emailVerified, refreshAuth, router]);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerifyNow = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success("Verification email sent! Check your inbox.");
      setCooldown(30);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/too-many-requests') {
        toast.error("Too many requests. Please try again later.");
      } else {
        toast.error(error.message || "Failed to send verification email");
      }
    }
  };

  const handleManualCheck = async () => {
    if (!auth.currentUser) return;
    setChecking(true);
    try {
      await refreshAuth();
      if (auth.currentUser?.emailVerified) {
        toast.success("Email verified!");
        router.replace("/");
      } else {
        toast.error("Email not verified yet. Please check your inbox.");
      }
    } catch (error) {
      toast.error("Failed to check status");
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-white border-2 border-zinc-100 rounded-full mb-6 shadow-xl">
          <Logo size="md" />
        </div>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white py-10 px-8 shadow-2xl rounded-[40px] sm:px-12 border border-zinc-100 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL'1" }}>mail</span>
          </div>
          
          <h2 className="text-3xl font-headline font-black text-zinc-900 tracking-tighter leading-none mb-3">
            Verify Your Email
          </h2>
          <p className="text-sm font-bold text-zinc-500 leading-relaxed mb-10">
            Please verify your email address to secure your account and start shopping on BazaarBolt.
          </p>

          <div className="space-y-4">
            <button
              onClick={handleVerifyNow}
              disabled={cooldown > 0}
              className="w-full h-16 flex justify-center items-center gap-2 border border-transparent rounded-[20px] shadow-xl text-xs font-black text-zinc-900 bg-primary hover:bg-green-500 focus:outline-none disabled:opacity-70 disabled:grayscale transition-all tracking-[0.2em] active:scale-95"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Verify Now"}
            </button>

            <button
              onClick={handleManualCheck}
              disabled={checking}
              className="w-full h-14 flex justify-center items-center gap-2 bg-white border border-zinc-100 rounded-2xl text-[10px] font-black text-zinc-600 hover:bg-zinc-50 transition-all active:scale-95 shadow-sm tracking-widest uppercase"
            >
              {checking ? (
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              ) : (
                "I have verified"
              )}
            </button>
          </div>

          <div className="mt-10 border-t border-zinc-100 pt-8">
            <button
              onClick={() => auth.signOut()}
              className="text-[10px] font-black text-zinc-400 hover:text-red-500 transition-colors tracking-widest uppercase flex items-center justify-center gap-2 mx-auto"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Sign in with another account
            </button>
          </div>
        </div>

        <p className="text-center text-[8px] text-zinc-300 font-bold mt-10 max-w-[200px] mx-auto tracking-widest leading-relaxed uppercase">
          Ensuring secure and fast deliveries for you. ⚡️
        </p>
      </div>
    </div>
  );
}
