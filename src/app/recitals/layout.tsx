import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dance Recital Video, Livestream & Photography | StreamStage",
  description:
    "Multi-camera recital video, livestreaming for family who can't be there, and photography. You charge the media fee and keep the spread. Transparent per-dancer pricing. Ontario, Canada.",
  alternates: { canonical: "/recitals" },
  openGraph: {
    title: "Your recital, captured properly | StreamStage",
    description:
      "Multi-camera recital video, livestream and photography. You charge the media fee and keep the spread.",
    url: "https://streamstage.live/recitals",
  },
};

export default function RecitalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
