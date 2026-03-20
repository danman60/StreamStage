import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <Link href="/" className="inline-block mb-8">
          <Image
            src="/logo-white.png"
            alt="StreamStage.live"
            width={200}
            height={58}
            className="h-12 w-auto mx-auto"
          />
        </Link>
        <h1 className="font-heading text-5xl font-bold text-white mb-4">
          404
        </h1>
        <p className="text-lg text-gray-400 mb-8">
          This page doesn&rsquo;t exist or has moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="px-6 py-3 text-sm font-semibold rounded-lg bg-cyan-brand text-charcoal-deep hover:bg-cyan-brand/90 transition-all duration-200"
          >
            Go Home
          </Link>
          <Link
            href="/dance"
            className="px-6 py-3 text-sm font-semibold rounded-lg border border-cyan-brand/30 text-cyan-brand hover:bg-cyan-brand/10 transition-all duration-200"
          >
            Dance Services
          </Link>
          <Link
            href="/blog"
            className="px-6 py-3 text-sm font-semibold rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-all duration-200"
          >
            Blog
          </Link>
        </div>
      </div>
    </main>
  );
}
