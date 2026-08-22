import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrackProgress — suivi de charges",
  description:
    "Suis tes charges à la salle, compare-les à ta référence et visualise ta progression exercice par exercice.",
  applicationName: "TrackProgress",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "TrackProgress",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d10",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
