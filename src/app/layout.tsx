import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageTransition } from "@/components/PageTransition";
import { BottomNavWrapper } from "@/components/BottomNavWrapper";

const inter = Inter({ subsets: ["latin"] });
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "BazaarBolt | Quick Commerce",
  description: "Get groceries delivered in minutes",
};

import { PushNotificationManager } from "@/components/PushNotificationManager";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2579695907249215"
     crossOrigin="anonymous"></script>
      </head>
      <body className={`${inter.className} ${plusJakartaSans.className} min-h-screen bg-surface font-body text-on-surface antialiased`}>
        <ErrorBoundary>
          <AuthProvider>
            <PushNotificationManager />
            <PageTransition>
              {children}
            </PageTransition>
            <BottomNavWrapper />
          </AuthProvider>
          <Toaster position="top-center" />
        </ErrorBoundary>
      </body>
    </html>
  );
}
