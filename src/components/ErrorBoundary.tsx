"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import Link from "next/link";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught UI Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-red-100 max-w-lg w-full text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-5xl">warning</span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-zinc-900 tracking-tighter">Application Error</h1>
              <p className="text-zinc-500 font-bold text-sm">
                BazaarBolt encountered an unexpected issue in the user interface.
              </p>
            </div>

            <div className="bg-zinc-50 p-5 rounded-3xl border border-zinc-100 overflow-hidden">
               <code className="text-[10px] font-black uppercase tracking-widest text-red-500 block text-left break-words">
                 {this.state.error?.name}: {this.state.error?.message || "Critical UI Failure"}
               </code>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-lg active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">refresh</span> Reload Application
              </button>
              <Link 
                href="/" 
                onClick={() => this.setState({ hasError: false })} 
                className="text-xs font-black uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors"
              >
                Reset & Return Home
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
