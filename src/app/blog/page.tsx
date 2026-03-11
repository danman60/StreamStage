import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { ArrowLeft, Calendar, Clock, Tag } from "lucide-react";

export const revalidate = 43200; // 12 hours

export const metadata: Metadata = {
  title: "Blog — StreamStage",
  description:
    "Tips, guides, and insights for dance studios, competition organizers, and performing arts professionals.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <main className="min-h-screen py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-brand transition-colors mb-12"
        >
          <ArrowLeft size={16} />
          Back to StreamStage
        </Link>

        {/* Header */}
        <div className="mb-16">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-4">
            Blog
          </h1>
          <p className="text-lg text-gray-400">
            Tips, guides, and insights for dance studios, competition
            organizers, and performing arts professionals.
          </p>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">Posts coming soon.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block p-6 sm:p-8 rounded-2xl bg-charcoal-dark/50 border border-white/5 hover:border-cyan-brand/30 transition-all duration-300"
              >
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={14} />
                    {new Date(post.date).toLocaleDateString("en-CA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={14} />
                    {post.readingTime}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Tag size={14} />
                    {post.category}
                  </span>
                </div>

                <h2 className="font-heading text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-cyan-brand transition-colors">
                  {post.title}
                </h2>

                <p className="text-gray-400 leading-relaxed">
                  {post.description}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
