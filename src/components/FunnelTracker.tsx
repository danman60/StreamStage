"use client";

import { useEffect } from "react";
import { funnel } from "@/lib/analytics";

/* Fires one funnel event when a server-rendered page mounts. Kept separate so pages
   like /recitals stay server components. */

type Event = "viewRecitalPage";

export default function FunnelTracker({ event }: { event: Event }) {
  useEffect(() => {
    funnel[event]();
  }, [event]);

  return null;
}
