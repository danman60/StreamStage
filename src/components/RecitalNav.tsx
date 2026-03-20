"use client";

import Image from "next/image";
import Link from "next/link";

interface RecitalNavProps {
  ctaLabel?: string;
  ctaHref?: string;
}

export default function RecitalNav({
  ctaLabel = "Build Your Proposal",
  ctaHref = "/dancerecital",
}: RecitalNavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-charcoal-deep/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo-white.png"
              alt="StreamStage.live"
              width={160}
              height={46}
              className="h-10 sm:h-12 w-auto"
              priority
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="hidden sm:block text-sm text-gray-400 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              href={ctaHref}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-cyan-brand text-charcoal-deep hover:bg-cyan-brand/90 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-brand/20"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
