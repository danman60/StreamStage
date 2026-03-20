import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dance Promo Video Package Builder — Studio Promos & Social Content | StreamStage",
  description:
    "Build a custom promo video package for your dance studio. Gimbal cameras, brand stories, social reels, and raw footage. Volume discounts up to 20%. Ontario, Canada.",
  alternates: { canonical: "/dancepromo" },
  openGraph: {
    title: "Dance Promo Video Package Builder | StreamStage",
    description:
      "Custom promo video packages for dance studios. Cameras, brand stories, social reels. Volume discounts.",
    url: "https://streamstage.live/dancepromo",
  },
};

export default function DancePromoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
