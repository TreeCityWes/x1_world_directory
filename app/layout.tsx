import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Display cut for hero moments — wordmark, boss cards, capture beats. */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const TITLE = "x1.world — explore the X1 ecosystem · play X1 Ninja Survivors";
const DESCRIPTION =
  "A 3D world of the X1 blockchain ecosystem — and a game. Pick your fighter (X1 Ninja, Jack Levin, THEO, CAPY), survive the crypto horde, capture every real X1 project, slay THE WHALE, and inscribe your score on X1 mainnet. Every landmark is a live project with screenshots and links.";

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
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
