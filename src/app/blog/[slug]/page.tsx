import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug, getPostSlugs } from "@/lib/blog";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { MDXContent } from "@/components/mdx-content";

export const revalidate = 43200; // 12 hours

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} — StreamStage Blog`,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <main className="min-h-screen py-20">
      <article className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Back */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-brand transition-colors mb-12"
        >
          <ArrowLeft size={16} />
          All Posts
        </Link>

        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
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
              <User size={14} />
              {post.author}
            </span>
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            {post.title}
          </h1>

          <p className="text-lg text-gray-400">{post.description}</p>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-cyan-brand/10 text-cyan-brand"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none prose-headings:font-heading prose-headings:text-white prose-a:text-cyan-brand prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-code:text-cyan-brand prose-code:bg-charcoal-dark prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
          <MDXContent source={post.content} />
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/10">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-cyan-brand hover:text-white transition-colors font-medium"
          >
            <ArrowLeft size={16} />
            Back to all posts
          </Link>
        </footer>
      </article>
    </main>
  );
}
