import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Content Day — A Year of Studio Video in One Morning | StreamStage",
  description:
    "One shoot day at your studio becomes twelve months of posts. Promo films, social cuts, interviews and raw footage you can keep pulling from. For dance studios in Ontario, Canada.",
  alternates: { canonical: "/contentday" },
  openGraph: {
    title: "The Content Day | StreamStage",
    description:
      "One morning of shooting becomes a year of posts. Promo films, social cuts and raw footage for dance studios.",
    url: "https://streamstage.live/contentday",
  },
};

export default function ContentDayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
