import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  image?: string;
  readingTime: string;
  content: string;
}

export interface BlogPostMeta extends Omit<BlogPost, "content"> {}

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx") && !f.startsWith("_"));

  const now = new Date();
  now.setHours(23, 59, 59, 999); // include posts dated today

  const posts = files
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, "");
      const filePath = path.join(BLOG_DIR, filename);
      const source = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(source);
      const stats = readingTime(source);

      return {
        slug,
        title: data.title ?? slug,
        description: data.description ?? "",
        date: data.date ?? new Date().toISOString(),
        author: data.author ?? "StreamStage",
        category: data.category ?? "General",
        tags: data.tags ?? [],
        image: data.image,
        readingTime: stats.text,
      } satisfies BlogPostMeta;
    })
    .filter((post) => new Date(post.date) <= now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return posts;
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const source = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(source);
  const stats = readingTime(source);

  const postDate = new Date(data.date ?? new Date().toISOString());
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  if (postDate > now) return null;

  return {
    slug,
    title: data.title ?? slug,
    description: data.description ?? "",
    date: data.date ?? new Date().toISOString(),
    author: data.author ?? "StreamStage",
    category: data.category ?? "General",
    tags: data.tags ?? [],
    image: data.image,
    readingTime: stats.text,
    content,
  };
}

export function getPostSlugs(): string[] {
  return getAllPosts().map((p) => p.slug);
}
