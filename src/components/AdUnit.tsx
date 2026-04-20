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
    // Only push ads in production and only if the element exists
    const isDev = process.env.NODE_ENV === 'development';
    if (!isLoaded.current && !isDev) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isLoaded.current = true;
      } catch (err) {
        console.error("Google AdSense initialization error:", err);
      }
    }
  }, []);

  if (process.env.NODE_ENV === 'development') {
    return (
      <div className={`w-full overflow-hidden my-6 flex flex-col items-center justify-center min-h-[100px] bg-zinc-50 rounded-2xl border-2 border-zinc-200 border-dashed ${className}`}>
        <span className="material-symbols-outlined text-zinc-300 text-2xl mb-1">ads_click</span>
        <span className="font-bold text-[10px] tracking-widest text-zinc-400 uppercase">Google Ad Banner Space</span>
        <span className="font-medium text-[8px] tracking-widest text-zinc-400 mt-1">(Ads will appear in production)</span>
      </div>
    );
  }

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
