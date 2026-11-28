import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthBootstrap } from "@/components/auth/auth-bootstrap";
import splashScreens from "@/lib/splash-screens.json";
import "./globals.css";

/**
 * Écrans de démarrage iOS (images générées par `npm run icons`). iOS n'en
 * affiche un que si la media query correspond exactement à l'écran.
 */
const startupImage = splashScreens.flatMap(({ width, height, ratio }) =>
  (["light", "dark"] as const).map((theme) => ({
    url: `/splash/${width}x${height}@${ratio}x-${theme}.png`,
    media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait) and (prefers-color-scheme: ${theme})`,
  })),
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ReelQueue",
    template: "%s · ReelQueue",
  },
  description:
    "Votre file d’attente pour les Reels Instagram et vidéos à regarder plus tard.",
  applicationName: "ReelQueue",
  appleWebApp: {
    capable: true,
    title: "ReelQueue",
    statusBarStyle: "default",
    startupImage,
  },
  formatDetection: { telephone: false },
  // Next.js n'émet que « mobile-web-app-capable » ; iOS lit encore la balise
  // préfixée pour les écrans de démarrage.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0e11" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-dvh">
        <AuthBootstrap />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
