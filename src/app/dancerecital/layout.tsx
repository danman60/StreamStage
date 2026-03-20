import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dance Recital Proposal Builder — Video, Streaming & Photography | StreamStage",
  description:
    "Build a custom recital media proposal. Multi-camera video, livestreaming, and photography with transparent per-dancer pricing. You keep 100% of the revenue. Ontario, Canada.",
  alternates: { canonical: "/dancerecital" },
  openGraph: {
    title: "Dance Recital Proposal Builder | StreamStage",
    description:
      "Custom recital media proposal — video, livestreaming, photography. Transparent per-dancer pricing.",
    url: "https://streamstage.live/dancerecital",
  },
};

export default function DanceRecitalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
