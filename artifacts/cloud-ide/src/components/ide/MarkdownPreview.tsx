import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

interface MarkdownPreviewProps {
  content: string;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export default function MarkdownPreview({ content, scrollRef, onScroll }: MarkdownPreviewProps) {
  const remarkPlugins = useMemo(() => [remarkGfm], []);
  const rehypePlugins = useMemo(() => [rehypeHighlight], []);

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="h-full overflow-y-auto bg-[#0d1117] p-6"
      data-testid="markdown-preview"
    >
      <div className="prose prose-invert prose-sm max-w-none
        prose-headings:text-gray-200 prose-headings:border-b prose-headings:border-gray-700 prose-headings:pb-2
        prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
        prose-p:text-gray-300 prose-p:leading-relaxed
        prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-gray-200
        prose-code:text-pink-400 prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-[#161b22] prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-lg
        prose-pre:p-0
        prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-500/5 prose-blockquote:py-1 prose-blockquote:text-gray-400
        prose-table:border-collapse
        prose-th:bg-gray-800 prose-th:border prose-th:border-gray-700 prose-th:px-3 prose-th:py-2 prose-th:text-gray-300
        prose-td:border prose-td:border-gray-700 prose-td:px-3 prose-td:py-2
        prose-li:text-gray-300 prose-li:marker:text-gray-500
        prose-hr:border-gray-700
        prose-img:rounded-lg
      ">
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
