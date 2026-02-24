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
        {/* Fixed fullscreen background video */}
        <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute min-w-full min-h-full w-auto h-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-cover"
          >
            <source src="/hero-bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-charcoal-deep/75" />
        </div>
        <div className="noise-overlay" aria-hidden="true" />
        <div className="relative z-[2]">
          {children}
        </div>
      </body>
    </html>
  );
}
