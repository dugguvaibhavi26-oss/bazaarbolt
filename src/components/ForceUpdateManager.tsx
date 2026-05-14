"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppUpdate } from "@capawesome/capacitor-app-update";
import { ArrowDownTrayIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export function ForceUpdateManager({ children }: { children: React.ReactNode }) {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [updateUrl, setUpdateUrl] = useState("");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkUpdates = async () => {
      try {
        if (!Capacitor.isNativePlatform()) {
          setIsChecking(false);
          return;
        }

        // 1. Try Native Google Play Store Update First
        try {
          const result = await AppUpdate.getAppUpdateInfo();
          if (result.updateAvailability === 2) { // 2 = UPDATE_AVAILABLE
            // Force immediate native Google Play update UI
            await AppUpdate.performImmediateUpdate();
            return;
          }
        } catch (playError) {
          console.warn("Play Store update check failed (app might not be published yet)", playError);
        }

        // 2. Fallback to Firebase Remote Config for APK users
        const info = await App.getInfo();
        const currentVersion = info.version; // e.g. "1.0.0"

        const settingsRef = doc(db, "settings", "appUpdate");
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          const requiredVersion = data.requiredVersion; // e.g. "1.0.1"
          
          if (requiredVersion && isVersionLower(currentVersion, requiredVersion)) {
            setUpdateUrl(data.downloadUrl || "https://bazaarbolt.com/download");
            setNeedsUpdate(true);
          }
        }
      } catch (error) {
        console.error("Failed to check for updates:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkUpdates();
  }, []);

  // Simple semantic version comparator (1.0.0 < 1.0.1)
  const isVersionLower = (current: string, required: string) => {
    const cParts = current.split('.').map(Number);
    const rParts = required.split('.').map(Number);
    
    for (let i = 0; i < Math.max(cParts.length, rParts.length); i++) {
      const c = cParts[i] || 0;
      const r = rParts[i] || 0;
      if (c < r) return true;
      if (c > r) return false;
    }
    return false;
  };

  const handleUpdateClick = () => {
    // Open the update URL in the external browser
    if (updateUrl) {
      window.open(updateUrl, "_blank");
    }
  };

  if (needsUpdate) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-600 dark:text-red-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Update Required
        </h1>
        
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
          A new version of BazaarBolt is available. You must update your app to continue using our services.
        </p>

        <button
          onClick={handleUpdateClick}
          className="w-full max-w-xs flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black font-semibold py-4 px-6 rounded-xl shadow-lg active:scale-95 transition-all"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          Update Now
        </button>
      </div>
    );
  }

  // If no update is required, render the app normally
  return <>{children}</>;
}
