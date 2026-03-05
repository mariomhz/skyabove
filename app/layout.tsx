import type { Metadata } from "next";
import { Inter } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://skyabove-dashboard.vercel.app"),
  title: "SKYABOVE — Real-Time Flight Dashboard",
  description:
    "Live aviation metrics, airline rankings, and delay tracking — built with Next.js, GSAP, and the AviationStack API.",
  openGraph: {
    title: "SKYABOVE — Real-Time Flight Dashboard",
    description:
      "Live aviation metrics, airline rankings, and delay tracking — built with Next.js, GSAP, and the AviationStack API.",
    url: "https://skyabove-dashboard.vercel.app",
    siteName: "SKYABOVE",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SKYABOVE — Real-Time Flight Dashboard",
    description:
      "Live aviation metrics, airline rankings, and delay tracking.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
