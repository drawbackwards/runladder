"use client";

import { useState, useRef } from "react";
import { LadderScore, LadderMeter } from "@/components/LadderScore";

type Finding = {
  title: string;
  impact: string;
  fix: string;
  category: string;
};

type ScoreResult = {
  score: number;
  label: string;
  summary: string;
  next: string;
  findings: Finding[];
};

export default function ScorePage() {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, WebP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB");
      return;
    }
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function scoreImage() {
    if (!image) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scoring failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setImage(null);
    setFileName("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="pt-24 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-3">Score a screen</h1>
          <p className="text-muted">
            Upload a screenshot. Get your Ladder score in seconds.
          </p>
        </div>

        {!result ? (
          <>
            {/* Upload area */}
            {!image ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-2xl p-16 text-center cursor-pointer hover:border-muted transition-colors"
              >
                <p className="text-muted mb-2">
                  Drop a screenshot here or click to upload
                </p>
                <p className="text-xs text-muted/50">
                  PNG, JPG, or WebP — up to 10MB
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border border-border rounded-2xl overflow-hidden bg-card">
                  <img
                    src={image}
                    alt="Screenshot to score"
                    className="w-full max-h-[400px] object-contain"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted truncate max-w-xs">
                    {fileName}
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={reset}
                      className="text-sm text-muted hover:text-foreground transition-colors"
                    >
                      Change image
                    </button>
                    <button
                      onClick={scoreImage}
                      disabled={loading}
                      className="bg-ladder-green text-background font-semibold px-6 py-2 rounded-full hover:bg-ladder-green/90 transition-colors disabled:opacity-50"
                    >
                      {loading ? "Scoring..." : "Score this screen"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 text-muted">
                  <span className="animate-pulse">Analyzing your design</span>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Results */
          <div className="space-y-6">
            {/* Score card */}
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <p className="font-mono text-xs text-muted uppercase tracking-wider mb-4">
                Ladder Score
              </p>
              <LadderScore score={result.score} size="xl" />
              <div className="max-w-md mx-auto mt-6">
                <LadderMeter score={result.score} />
              </div>
              <p className="text-sm text-muted mt-6 leading-relaxed max-w-md mx-auto">
                &ldquo;{result.summary}&rdquo;
              </p>
            </div>

            {/* Next step */}
            <div className="bg-card border border-ladder-green/20 rounded-xl p-5">
              <p className="font-mono text-xs text-ladder-green uppercase tracking-wider mb-2">
                To reach the next level
              </p>
              <p className="text-sm text-foreground">{result.next}</p>
            </div>

            {/* Findings */}
            {result.findings && result.findings.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-mono text-xs text-muted uppercase tracking-wider">
                  Findings
                </h3>
                {result.findings.map((f, i) => (
                  <div
                    key={i}
                    className="bg-card border border-border rounded-xl p-5"
                  >
                    <h4 className="text-sm font-semibold mb-1">{f.title}</h4>
                    <p className="text-sm text-muted mb-2">{f.impact}</p>
                    <p className="text-xs text-ladder-green">{f.fix}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={reset}
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                Score another screen
              </button>
              <button
                onClick={() => {
                  const text = `Ladder Score: ${result.score.toFixed(1)} (${result.label})\n\n${result.summary}\n\nScore yours at runladder.com`;
                  navigator.clipboard.writeText(text);
                }}
                className="text-sm text-ladder-green hover:underline"
              >
                Copy results
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-ladder-red text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
