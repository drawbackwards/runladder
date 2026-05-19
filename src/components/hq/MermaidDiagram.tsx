"use client";

import { useEffect, useRef, useState } from "react";

let initialized = false;

async function ensureInit() {
  const mermaid = (await import("mermaid")).default;
  if (initialized) return mermaid;
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    themeVariables: {
      primaryColor: "#1a1a1a",
      primaryTextColor: "#ededed",
      primaryBorderColor: "#6AC89B",
      lineColor: "#6AC89B",
      secondaryColor: "#222",
      tertiaryColor: "#111",
      background: "#1a1a1a",
      fontFamily: "var(--font-sans), Inter, sans-serif",
      fontSize: "13px",
    },
    securityLevel: "loose",
  });
  initialized = true;
  return mermaid;
}

export function MermaidDiagram({
  chart,
  children,
}: {
  chart?: string;
  children?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const source = (chart ?? children ?? "").toString();

  useEffect(() => {
    if (!source) {
      setError("Mermaid: no diagram source provided");
      return;
    }
    let cancelled = false;
    const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
    ensureInit()
      .then((mermaid) => mermaid.render(id, source.trim()))
      .then(({ svg }) => {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Mermaid render failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (error) {
    return (
      <div className="my-6 border border-ladder-red/40 bg-ladder-red/5 text-ladder-red text-xs p-3 font-mono whitespace-pre-wrap">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-8 flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
    />
  );
}
