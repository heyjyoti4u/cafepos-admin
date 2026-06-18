import type { Metadata, Viewport } from "next"; 
import { Inter } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { CookieConsent } from "@/components/cookie-consent";

const inter = Inter({ subsets: ["latin"] });

// ✅ PWA Manifest aur Apple App settings add kiye
export const metadata: Metadata = {
  title: "Cafe POS Terminal",
  description: "Secure Kitchen POS",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cafe POS",
  },
};

// ✅ Mobile par zoom block kiya taaki Native App jaisa feel ho
export const viewport: Viewport = {
  themeColor: "#ea580c", 
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
