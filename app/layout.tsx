import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
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
        <Script
          id="kakao-js-sdk"
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.9/kakao.min.js"
          strategy="afterInteractive"
          integrity="sha384-JpLApTkB8lPskhVMhT+m5Ln8aHlnS0bsIexhaak0jOhAkMYedQoVghPfSpjNi9K1"
          crossOrigin="anonymous"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
