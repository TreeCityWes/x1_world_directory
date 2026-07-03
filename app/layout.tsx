import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "x1.world — explore the X1 ecosystem";
const DESCRIPTION =
  "An interactive 3D world of the X1 blockchain ecosystem. Drive a little ninja around a living network planet — every landmark is a real X1 project, with live screenshots, health checks, and links.";

export const metadata: Metadata = {
  metadataBase: new URL("https://x1.world"),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "X1",
    "X1 blockchain",
    "XNT",
    "SVM",
    "X1 ecosystem",
    "validator",
    "crypto",
    "interactive 3D",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://x1.world",
    siteName: "x1.world",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "The x1.world interactive ecosystem globe",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
