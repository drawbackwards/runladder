"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { AnnotationFinding } from "@/lib/evaluation";

type Props = {
  imageDataUrl: string;
  findings: AnnotationFinding[];
  displayWidth?: number;
  onFindingEdit?: (id: string, field: "humanNote" | "fix" | "issue", value: string) => void;
  readOnly?: boolean;
};

const MARGIN_W = 220;
const STEM = 14;
const MIN_SLOT = 76;

type AnnotationLayout = {
  id: string;
  finding: AnnotationFinding;
  pinX: number;
  pinY: number;
  elbowY: number;
  exitX: number;
  textY: number;
  side: "left" | "right";
};

function computeLayout(
  findings: AnnotationFinding[],
  imgW: number,
  imgH: number,
): AnnotationLayout[] {
  const layouts = findings.map((f) => {
    const pinX = f.xPercent * imgW;
    const pinY = f.yPercent * imgH;
    const side: "left" | "right" = f.xPercent < 0.5 ? "left" : "right";
    // Exit point: 8px outside the image edge
    const exitX = side === "left" ? -8 : imgW + 8;
    const dx = Math.abs(pinX - exitX);
    // Go up from lower half, down from upper half
    const goUp = f.yPercent >= 0.5;
    const elbowY = goUp ? pinY - STEM : pinY + STEM;
    const naturalTextY = goUp ? elbowY - dx : elbowY + dx;
    return { id: f.id, finding: f, pinX, pinY, elbowY, exitX, textY: naturalTextY, side };
  });

  // Resolve collisions per side
  for (const side of ["left", "right"] as const) {
    const sideItems = layouts
      .filter((l) => l.side === side)
      .sort((a, b) => a.textY - b.textY);
    for (let i = 1; i < sideItems.length; i++) {
      if (sideItems[i].textY < sideItems[i - 1].textY + MIN_SLOT) {
        sideItems[i].textY = sideItems[i - 1].textY + MIN_SLOT;
      }
    }
  }

  return layouts;
}

const SEVERITY_COLOR = {
  high: "#ef4444",
  medium: "#f97316",
  low: "#eab308",
} as const;

export function AnnotatedScreen({
  imageDataUrl,
  findings,
  displayWidth = 620,
  onFindingEdit,
  readOnly = false,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgH, setImgH] = useState<number | null>(null);

  const measureImage = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const h = Math.round(displayWidth * (img.naturalHeight / img.naturalWidth));
    setImgH(h);
  }, [displayWidth]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth) {
      measureImage();
    }
  }, [measureImage]);

  const layout = imgH ? computeLayout(findings, displayWidth, imgH) : [];
  const totalWidth = MARGIN_W + displayWidth + MARGIN_W;

  return (
    <div style={{ width: totalWidth, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {/* Left margin */}
        <div style={{ width: MARGIN_W, flexShrink: 0, position: "relative", height: imgH ?? "auto" }}>
          {layout
            .filter((a) => a.side === "left")
            .map((a) => (
              <AnnotationTextBlock
                key={a.id}
                annotation={a}
                side="left"
                onEdit={onFindingEdit}
                readOnly={readOnly}
              />
            ))}
        </div>

        {/* Image + SVG pin overlay */}
        <div style={{ width: displayWidth, flexShrink: 0, position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageDataUrl}
            alt="Screen"
            onLoad={measureImage}
            style={{ width: "100%", display: "block" }}
          />
          {imgH && (
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: displayWidth,
                height: imgH,
                overflow: "visible",
                pointerEvents: "none",
              }}
              viewBox={`0 0 ${displayWidth} ${imgH}`}
            >
              {layout.map((a) => {
                const color = SEVERITY_COLOR[a.finding.severity] ?? "#ef4444";
                const points = `${a.pinX},${a.pinY} ${a.pinX},${a.elbowY} ${a.exitX},${a.textY}`;
                return (
                  <g key={a.id}>
                    {/* Pin dot */}
                    <circle cx={a.pinX} cy={a.pinY} r={5} fill={color} opacity={0.9} />
                    <circle cx={a.pinX} cy={a.pinY} r={3} fill={color} />
                    {/* Vertical stem + 45° diagonal */}
                    <polyline
                      points={points}
                      stroke={color}
                      strokeWidth={1}
                      fill="none"
                      opacity={0.7}
                    />
                    {/* Short horizontal tick at text end */}
                    <line
                      x1={a.exitX}
                      y1={a.textY}
                      x2={a.side === "left" ? a.exitX - 12 : a.exitX + 12}
                      y2={a.textY}
                      stroke={color}
                      strokeWidth={1}
                      opacity={0.7}
                    />
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Right margin */}
        <div style={{ width: MARGIN_W, flexShrink: 0, position: "relative", height: imgH ?? "auto" }}>
          {layout
            .filter((a) => a.side === "right")
            .map((a) => (
              <AnnotationTextBlock
                key={a.id}
                annotation={a}
                side="right"
                onEdit={onFindingEdit}
                readOnly={readOnly}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function AnnotationTextBlock({
  annotation: a,
  side,
  onEdit,
  readOnly,
}: {
  annotation: AnnotationLayout;
  side: "left" | "right";
  onEdit?: (id: string, field: "humanNote" | "fix" | "issue", value: string) => void;
  readOnly?: boolean;
}) {
  const color = SEVERITY_COLOR[a.finding.severity] ?? "#ef4444";
  const offset = a.textY - 10;

  return (
    <div
      style={{
        position: "absolute",
        top: offset,
        ...(side === "left"
          ? { right: 16, textAlign: "right" }
          : { left: 16, textAlign: "left" }),
        width: MARGIN_W - 28,
      }}
    >
      <div
        style={{ color, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}
      >
        {a.finding.title}
      </div>
      {readOnly ? (
        <>
          <p style={{ fontSize: 11, color: "#aaa", margin: "2px 0", lineHeight: 1.4 }}>
            {a.finding.issue}
          </p>
          <p style={{ fontSize: 11, color: "#666", margin: "2px 0", lineHeight: 1.4 }}>
            → {a.finding.fix}
          </p>
          {a.finding.humanNote && (
            <p style={{ fontSize: 11, color: "#6AC89B", margin: "4px 0 0", lineHeight: 1.4 }}>
              {a.finding.humanNote}
            </p>
          )}
        </>
      ) : (
        <div className="space-y-1">
          <textarea
            value={a.finding.issue}
            onChange={(e) => onEdit?.(a.id, "issue", e.target.value)}
            rows={2}
            style={{ fontSize: 11, width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #333", color: "#aaa", resize: "vertical", outline: "none", padding: "2px 0", lineHeight: 1.4 }}
          />
          <textarea
            value={a.finding.fix}
            onChange={(e) => onEdit?.(a.id, "fix", e.target.value)}
            rows={2}
            style={{ fontSize: 11, width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #333", color: "#666", resize: "vertical", outline: "none", padding: "2px 0", lineHeight: 1.4 }}
            placeholder="Fix direction…"
          />
          <textarea
            value={a.finding.humanNote}
            onChange={(e) => onEdit?.(a.id, "humanNote", e.target.value)}
            rows={1}
            style={{ fontSize: 11, width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #333", color: "#6AC89B", resize: "vertical", outline: "none", padding: "2px 0", lineHeight: 1.4 }}
            placeholder="Add note…"
          />
        </div>
      )}
    </div>
  );
}
