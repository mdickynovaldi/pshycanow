import type { Metadata } from "next";

import "./globals.css";
import Navbar from "@/components/navbar";
import { SessionProvider } from "@/components/session-provider";
import { Toaster } from "@/components/ui/sonner"




export const metadata: Metadata = {
  title: "PsycaNow",
  description: "Aplikasi Pembelajaran untuk Guru dan Siswa",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body 
        className="bg-gray-50 text-gray-800 flex flex-col min-h-screen"
        suppressHydrationWarning
        >
          <SessionProvider>
            <Navbar />
            <main className="min-h-[calc(100vh-4rem)] flex-1">
              {children}
            </main>
            <Toaster position="top-right" closeButton richColors />
          </SessionProvider>
        </body>
    </html>
  );
}
