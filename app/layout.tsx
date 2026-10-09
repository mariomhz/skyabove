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
    "Live statistics for every tracked aircraft in the sky — built with Next.js, GSAP, and OpenSky Network ADS-B data.",
  openGraph: {
    title: "SKYABOVE — Real-Time Flight Dashboard",
    description:
      "Live statistics for every tracked aircraft in the sky — built with Next.js, GSAP, and OpenSky Network ADS-B data.",
    url: "https://skyabove-dashboard.vercel.app",
    siteName: "SKYABOVE",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SKYABOVE — Real-Time Flight Dashboard",
    description:
      "Live statistics for every tracked aircraft in the sky.",
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
