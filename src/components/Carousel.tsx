import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Horizontal snap-scrolling row with arrow buttons + edge fades.
 * Purely presentational — items are rendered via `render`.
 */
export default function Carousel<T>({
  items,
  render,
  itemClassName = "w-44",
  ariaLabel,
}: {
  items: T[];
  render: (item: T) => React.ReactNode;
  itemClassName?: string;
  ariaLabel?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  const update = () => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScroll({ left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 });
  };

  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items]);

  const scrollBy = (dir: number) =>
    trackRef.current?.scrollBy({
      left: dir * (trackRef.current.clientWidth * 0.8),
      behavior: "smooth",
    });

  const arrowCls =
    "absolute top-1/2 z-20 hidden -translate-y-1/2 place-items-center rounded-full border border-parchment-deep bg-surface shadow-lg transition hover:text-brand disabled:pointer-events-none disabled:opacity-0 lg:grid size-11";

  return (
    <div className="relative" aria-label={ariaLabel}>
      {/* edge fades hint that the row scrolls */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-paper to-transparent transition-opacity ${
          canScroll.left ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-paper to-transparent transition-opacity ${
          canScroll.right ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        ref={trackRef}
        onScroll={update}
        className="no-scrollbar flex snap-x gap-4 overflow-x-auto px-0.5 pb-2"
      >
        {items.map((item, i) => (
          <div key={i} className={`shrink-0 snap-start ${itemClassName}`}>
            {render(item)}
          </div>
        ))}
      </div>

      <button
        onClick={() => scrollBy(-1)}
        disabled={!canScroll.left}
        aria-label="Mëparshëm"
        className={`${arrowCls} -left-5`}
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        onClick={() => scrollBy(1)}
        disabled={!canScroll.right}
        aria-label="Tjetër"
        className={`${arrowCls} -right-5`}
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}
