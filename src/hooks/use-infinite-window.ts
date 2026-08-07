"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Client-side windowing for long lists (#448). Renders `pageSize` items and
 * reveals another page whenever the returned `sentinelRef` element scrolls
 * into view, until `total` is reached — so a large score history doesn't mount
 * every row (and every thumbnail `<img>`) at once.
 *
 * Purely a render window: the caller keeps the full array (the dashboard's
 * activity heatmap still needs all of it). Attach `sentinelRef` to a small
 * element placed AFTER the list, and render `items.slice(0, visibleCount)`.
 */
export function useInfiniteWindow(
  total: number,
  pageSize = 30,
): {
  visibleCount: number;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  hasMore: boolean;
} {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = visibleCount < total;

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => c + pageSize);
        }
      },
      // Start loading the next page a little before the sentinel is visible so
      // the reveal feels seamless.
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // `visibleCount` is a dependency so the observer re-arms after each reveal.
    // An IntersectionObserver only fires on intersection *changes*, so if the
    // whole list fits on screen the sentinel stays visible and a stable
    // observer would fire once and stall. Re-creating it each page lets it
    // keep filling until the viewport is full or everything is shown.
  }, [hasMore, pageSize, visibleCount]);

  return { visibleCount, sentinelRef, hasMore };
}
