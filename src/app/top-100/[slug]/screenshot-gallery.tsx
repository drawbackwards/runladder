"use client";

import Image from "next/image";
import { useState, useCallback, useEffect } from "react";

const SECTIONS = [
  { key: "hero", label: "Above the fold" },
  { key: "mid", label: "Mid-page" },
  { key: "lower", label: "Lower page" },
] as const;

export function ScreenshotGallery({
  slug,
  productName,
  url,
}: {
  slug: string;
  productName: string;
  url: string;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const close = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    if (lightbox === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight")
        setLightbox((i) => (i !== null ? (i + 1) % 3 : null));
      if (e.key === "ArrowLeft")
        setLightbox((i) => (i !== null ? (i + 2) % 3 : null));
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [lightbox, close]);

  return (
    <>
      <div className="mt-8">
        <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-3">
          Interface screenshots
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SECTIONS.map((section, i) => (
            <button
              key={section.key}
              onClick={() => setLightbox(i)}
              className="border border-border rounded overflow-hidden bg-card/30 hover:border-muted transition-colors cursor-pointer group"
            >
              <Image
                src={`/screenshots/${slug}/${section.key}.png`}
                alt={`${productName} ${section.label.toLowerCase()}`}
                width={480}
                height={300}
                className="w-full h-auto group-hover:opacity-80 transition-opacity"
                unoptimized
              />
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted mt-2">
          Captured from {url} at 1440px viewport
        </p>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
          onClick={close}
        >
          <button
            onClick={close}
            className="absolute top-6 right-6 text-white/60 hover:text-white text-sm transition-colors"
          >
            Close
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((lightbox + 2) % 3);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-2xl transition-colors p-2"
          >
            &lsaquo;
          </button>

          <div
            className="max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={`/screenshots/${slug}/${SECTIONS[lightbox].key}.png`}
              alt={`${productName} ${SECTIONS[lightbox].label.toLowerCase()}`}
              width={1440}
              height={900}
              className="w-full h-auto rounded-lg"
              unoptimized
            />
            <p className="text-center text-xs text-white/50 mt-3">
              {SECTIONS[lightbox].label}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((lightbox + 1) % 3);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-2xl transition-colors p-2"
          >
            &rsaquo;
          </button>
        </div>
      )}
    </>
  );
}
