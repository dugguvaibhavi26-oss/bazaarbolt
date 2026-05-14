import { Suspense } from "react";
import { DealsContent } from "./DealsClient";

export default function DealsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    }>
      <DealsContent />
    </Suspense>
  );
}
