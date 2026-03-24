import { ImageResponse } from "next/og";
import { getProductBySlug } from "../data";
import { getScoreColor, getLevel } from "@/lib/ladder";

export const alt = "Ladder Score";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) {
    return new ImageResponse(
      <div style={{ display: "flex", background: "#0a0a0a", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 32 }}>
        Product not found
      </div>,
      { ...size }
    );
  }

  const color = getScoreColor(product.score);
  const level = getLevel(product.score);
  const pct = (product.score / 5) * 100;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#0a0a0a",
        padding: "60px 80px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6AC89B", fontSize: 18, fontWeight: 700, letterSpacing: "0.15em" }}>
          LADDER
        </div>
        <div style={{ color: "#555", fontSize: 16 }}>
          runladder.com/top-100/{product.slug}
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flex: 1, gap: 60, alignItems: "center" }}>
        {/* Left: product info */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ color: "#555", fontSize: 14, border: "1px solid #333", padding: "4px 12px" }}>
              {product.category}
            </span>
            <span style={{ color: "#555", fontSize: 14 }}>
              #{product.rank} of 100
            </span>
          </div>

          <div style={{ color: "#fff", fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
            {product.name}
          </div>

          <div style={{ color: "#999", fontSize: 20, lineHeight: 1.5, maxWidth: 500 }}>
            {product.verdict}
          </div>
        </div>

        {/* Right: score */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 220,
            height: 220,
            border: `2px solid ${color}`,
            borderRadius: 16,
          }}
        >
          <div style={{ color, fontSize: 80, fontWeight: 800, lineHeight: 1 }}>
            {product.score.toFixed(1)}
          </div>
          <div style={{ color, fontSize: 18, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>
            {level}
          </div>
        </div>
      </div>

      {/* Score bar */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
        <div style={{ display: "flex", width: "100%", height: 8, background: "#222", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "#444", fontSize: 12 }}>
          <span>1.0 Functional</span>
          <span>2.0 Usable</span>
          <span>3.0 Comfortable</span>
          <span>4.0 Delightful</span>
          <span>5.0 Meaningful</span>
        </div>
      </div>
    </div>,
    { ...size }
  );
}
