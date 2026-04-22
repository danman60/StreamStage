import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Video Production Proposal Builder | StreamStage",
  description:
    "Build a custom StreamStage video production proposal with campaign video options, marketing support, and transparent investment summary.",
  alternates: { canonical: "/videoproduction" },
  openGraph: {
    title: "Video Production Proposal Builder | StreamStage",
    description:
      "Select campaign video options and marketing support, then submit your StreamStage video production proposal.",
    url: "https://streamstage.live/videoproduction",
  },
};

export default function VideoProductionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
