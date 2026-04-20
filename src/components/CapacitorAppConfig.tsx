"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function CapacitorAppConfig() {
  const router = useRouter();

  useEffect(() => {
    const setupCapacitor = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        
        if (Capacitor.isNativePlatform()) {
          // 1. Hardware Back Button Handler
          try {
            const { App } = await import("@capacitor/app");
            App.addListener("backButton", ({ canGoBack }) => {
              if (canGoBack) {
                router.back();
              } else {
                App.exitApp();
              }
            });
          } catch (e) {
            console.warn("Capacitor App plugin error:", e);
          }

          // 2. Lock Orientation to prevent rotatory behavior
          try {
            const { ScreenOrientation } = await import("@capacitor/screen-orientation");
            await ScreenOrientation.lock({ orientation: 'portrait' });
          } catch (e) {
            console.warn("Capacitor ScreenOrientation plugin error:", e);
          }
        }
      } catch (e) {
        // Not inside Capacitor
      }
    };

    setupCapacitor();
  }, [router]);

  return null;
}
