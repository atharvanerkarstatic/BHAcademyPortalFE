import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { ToastProvider } from "@/components/ui/toast";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "AP Colour Academy",
  description: "AP Colour Academy admin portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="bg-slate-100 text-slate-800 antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
