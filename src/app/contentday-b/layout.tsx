import type { Metadata } from "next";

/* Variant B, for evaluation against /contentday. noindex so it cannot split search signals
   with the primary page while both are live. */
export const metadata: Metadata = {
  title: "The Content Day (B) | StreamStage",
  description:
    "Variant B of the content day campaign landing page. One shoot day becomes a year of posts.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/contentday" },
};

export default function ContentDayBLayout({ children }: { children: React.ReactNode }) {
  return children;
}
