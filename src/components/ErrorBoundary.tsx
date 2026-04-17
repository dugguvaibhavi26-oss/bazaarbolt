"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
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
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-error-container max-w-lg w-full text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-error-container text-error rounded-full flex items-center justify-center shadow-inner">
              <AlertTriangle size={40} strokeWidth={2.5} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-on-surface tracking-tighter">Application Error</h1>
              <p className="text-on-surface-variant font-bold text-sm">
                BazaarBolt encountered an unexpected issue in the user interface.
              </p>
            </div>

            <div className="bg-surface-container-low p-5 rounded-3xl border border-outline-variant overflow-hidden">
               <code className="text-[10px] font-black uppercase tracking-widest text-error block text-left break-words">
                 {this.state.error?.name}: {this.state.error?.message || "Critical UI Failure"}
               </code>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-lg active:scale-95"
              >
                <RotateCcw size={18} /> Reload Application
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
