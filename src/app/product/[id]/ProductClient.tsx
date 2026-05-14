"use client";

import { useParams, useRouter } from "next/navigation";
import { ProductDetails } from "@/components/ProductDetails";

export function ProductContent() {
  const params = useParams();
  const productId = params?.id as string;
  const router = useRouter();

  if (!productId) return null;

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="fixed top-0 w-full z-50 pt-safe px-4 py-4 flex justify-between items-center pointer-events-none">
        <button onClick={() => router.back()} className="w-10 h-10 bg-white rounded-full shadow-lg pointer-events-auto active:scale-90 transition-transform flex items-center justify-center border border-zinc-100">
          <span className="material-symbols-outlined text-zinc-900 font-bold">arrow_back</span>
        </button>
        <div className="flex gap-2">
          <button onClick={() => router.push('/search')} className="w-10 h-10 bg-white rounded-full shadow-lg pointer-events-auto active:scale-90 transition-transform flex items-center justify-center border border-zinc-100">
            <span className="material-symbols-outlined text-zinc-900 font-bold">search</span>
          </button>
        </div>
      </header>

      <ProductDetails productId={productId} />
    </main>
  );
}
