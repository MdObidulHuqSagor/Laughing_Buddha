import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laughing Buddha — Modern Thai Kitchen | Gulshan, Dhaka",
  description:
    "Laughing Buddha is a modern Thai kitchen and hotpot bar in Gulshan 2, Dhaka. Scan-to-order at your table, or reserve your seat online.",
  icons: {
    icon: "/images/logo-mark.png",
    apple: "/images/logo-mark.png",
  },
  openGraph: {
    title: "Laughing Buddha — Modern Thai Kitchen, Gulshan Dhaka",
    description: "Scan-to-order Thai dining and hotpot in Gulshan 2, Dhaka.",
    images: ["/images/logo.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-cream text-ink antialiased">{children}</body>
    </html>
  );
}
