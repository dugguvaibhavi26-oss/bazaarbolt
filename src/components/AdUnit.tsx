"use client";

import React from 'react';

interface AdUnitProps {
  slotId?: string;
  type?: 'banner' | 'rectangle' | 'native';
  className?: string;
}

export function AdUnit({ slotId, type = 'banner', className = "" }: AdUnitProps) {
  return (
    <div className={`w-full overflow-hidden my-8 ${className}`}>
      <div className={`relative bg-zinc-50 border border-dashed border-zinc-200 rounded-[32px] flex flex-col items-center justify-center p-6 min-h-[120px] transition-all hover:bg-zinc-100 group`}>
        {/* Decorative corner accents to make it look premium */}
        <div className="absolute top-4 left-4 w-2 h-2 border-t-2 border-l-2 border-zinc-200 rounded-tl-sm group-hover:border-zinc-300"></div>
        <div className="absolute top-4 right-4 w-2 h-2 border-t-2 border-r-2 border-zinc-200 rounded-tr-sm group-hover:border-zinc-300"></div>
        <div className="absolute bottom-4 left-4 w-2 h-2 border-b-2 border-l-2 border-zinc-200 rounded-bl-sm group-hover:border-zinc-300"></div>
        <div className="absolute bottom-4 right-4 w-2 h-2 border-b-2 border-r-2 border-zinc-200 rounded-br-sm group-hover:border-zinc-300"></div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="bg-zinc-200 text-zinc-400 text-[7px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded">Sponsored</span>
            <span className="material-symbols-outlined text-zinc-200 text-sm">info</span>
          </div>
          
          <div className="flex flex-col items-center text-center">
             <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.3em]">Google Ad Placement</p>
             <p className="text-[8px] font-bold text-zinc-200 uppercase tracking-widest mt-1">Slot ID: {slotId || "0000-0000-0000"}</p>
          </div>
        </div>

        {/* Real AdSense script would go here in production */}
        {/* <ins className="adsbygoogle" ... /> */}
      </div>
      
      <p className="text-[7px] font-black text-zinc-300 text-center uppercase tracking-widest mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        ADS ENABLED VIA BAZAARBOLT MONETIZATION ENGINE
      </p>
    </div>
  );
}
