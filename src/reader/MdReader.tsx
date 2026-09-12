import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReaderProps } from "./ReaderPage";

/** Markdown master-text reader with scroll-position progress.
    Single newlines become hard breaks — essential for poetry, where the
    verse layout is part of the work (blank lines still open paragraphs). */
export default function MdReader({ url, theme, fontSize, saved, onProgress }: ReaderProps) {
  const [text, setText] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);

  const prepared = useMemo(() => {
    if (!text) return "";
    return text.replace(/([^\n])\n([^\n])/g, "$1  \n$2");
  }, [text]);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => r.text())
      .then((t) => !cancelled && setText(t))
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [url]);

  /* restore scroll once content has rendered, then emit an initial snapshot so
     even short files that never scroll still register as "last read" */
  useEffect(() => {
    if (!text || restoredRef.current) return;
    const el = scrollRef.current;
    const ratio = () => {
      if (!el || el.scrollHeight <= el.clientHeight) return 0;
      return Math.min(1, Math.max(0, el.scrollTop / (el.scrollHeight - el.clientHeight)));
    };
    if (el && saved?.position) {
      requestAnimationFrame(() => {
        el.scrollTop = Number(saved.position) * el.scrollHeight;
      });
    }
    onProgress({ position: String(ratio()), percent: ratio(), updatedAt: Date.now() });
    restoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || el.scrollHeight <= el.clientHeight) return;
    const ratio = el.scrollTop / (el.scrollHeight - el.clientHeight);
    onProgress({
      position: String(ratio),
      percent: Math.min(1, Math.max(0, ratio)),
      updatedAt: Date.now(),
    });
  };

  return (
    <div ref={scrollRef} onScroll={onScroll} className="h-full w-full overflow-y-auto">
      <div
        className={`prose prose-neutral mx-auto max-w-(--r-measure) px-6 py-10 text-(--r-text) ${theme === "dark" ? "prose-invert" : ""}`}
        style={{ fontSize: `${fontSize}%` }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{prepared}</ReactMarkdown>
      </div>
    </div>
  );
}
