import type { Metadata } from "next";

/* Variant B, for evaluation against /recitals. noindex so it cannot compete in search
   or split ranking signals with the primary page while both are live. */
export const metadata: Metadata = {
  title: "Recital Video, Livestream & Photography (B) | StreamStage",
  description:
    "Variant B of the recital campaign landing page. Multi-camera recital video, livestream and photography.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/recitals" },
};

export default function RecitalsBLayout({ children }: { children: React.ReactNode }) {
  return children;
}
