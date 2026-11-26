import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DiviSiri Shop",
  // Kept out of search engines until launch.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN">
      <body className="bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
