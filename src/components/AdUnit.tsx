"use client";

import React, { useEffect, useRef } from 'react';

interface AdUnitProps {
  slotId?: string;
  type?: 'banner' | 'rectangle' | 'native';
  className?: string;
}

export function AdUnit({ slotId = "", type = 'banner', className = "" }: AdUnitProps) {
  const isLoaded = useRef(false);

  useEffect(() => {
    // Only push the ad once per component mount to avoid duplication errors
    if (!isLoaded.current) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isLoaded.current = true;
      } catch (err) {
        console.error("Google AdSense initialization error:", err);
      }
    }
  }, []);

  return (
    <div className={`w-full overflow-hidden my-6 flex justify-center min-h-[100px] ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%" }}
        data-ad-client="ca-pub-2579695907249215"
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
}
