import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

import Providers from "@/components/providers";

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Helia",
  description: "Premium Postpartum Care Center Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.className} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
