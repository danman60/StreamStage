import type { Metadata } from "next";
import { Outfit, DM_Sans } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://streamstage.live"),
  title: "StreamStage — Where Dance Meets Technology",
  description:
    "Canada's dance industry partner — media production, software, and live broadcast. Dance & stage media, business video, and dance software solutions.",
  keywords: [
    "dance media",
    "livestreaming",
    "dance competition",
    "videography",
    "CompSync",
    "StudioSage",
    "StudioSync",
    "dance software",
    "Canada",
    "dance competition livestream",
    "dance recital video",
    "business video production",
    "Ontario videography",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "StreamStage — Where Dance Meets Technology",
    description:
      "Canada's dance industry partner — media production, software, and live broadcast.",
    url: "https://streamstage.live",
    siteName: "StreamStage",
    type: "website",
    locale: "en_CA",
  },
  twitter: {
    card: "summary_large_image",
    title: "StreamStage — Where Dance Meets Technology",
    description:
      "Canada's dance industry partner — media production, software, and live broadcast.",
  },
  other: {
    "theme-color": "#0e1117",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSans.variable}`}>
      <body className="font-body antialiased">
        <div className="noise-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
