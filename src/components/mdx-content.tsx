"use client";

import { MDXProvider } from "@mdx-js/react";
import { compile, run } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import { useEffect, useState, type ReactNode } from "react";

const components = {
  // Custom components available in MDX files
  Callout: ({
    type = "info",
    children,
  }: {
    type?: "info" | "tip" | "warning";
    children: ReactNode;
  }) => {
    const colors = {
      info: "border-cyan-brand/30 bg-cyan-brand/5",
      tip: "border-green-500/30 bg-green-500/5",
      warning: "border-amber-brand/30 bg-amber-brand/5",
    };
    return (
      <div className={`border-l-4 p-4 my-6 rounded-r-lg ${colors[type]}`}>
        {children}
      </div>
    );
  },
};

export function MDXContent({ source }: { source: string }) {
  const [content, setContent] = useState<ReactNode>(null);

  useEffect(() => {
    async function render() {
      const compiled = await compile(source, {
        outputFormat: "function-body",
      });
      const { default: MDXComponent } = await run(String(compiled), {
        ...runtime,
        baseUrl: import.meta.url,
      });
      setContent(<MDXComponent components={components} />);
    }
    render();
  }, [source]);

  if (!content) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-white/5 rounded w-3/4" />
        <div className="h-4 bg-white/5 rounded w-full" />
        <div className="h-4 bg-white/5 rounded w-5/6" />
      </div>
    );
  }

  return <MDXProvider components={components}>{content}</MDXProvider>;
}
