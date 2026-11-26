import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Poppins } from "next/font/google";
import "./globals.css";

// Downloaded at build time and served from the shop itself.
const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const display = Poppins({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-poppins" });

export const metadata: Metadata = {
  title: "DiviSiri Shop",
  // Kept out of search engines until launch.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${body.variable} ${display.variable}`}>
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
