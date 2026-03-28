"use client";

import { useState, useRef, useEffect } from "react";
import { getScoreColor, getLevelColor, getNextLevel, getGapToNext, getRungLevel } from "@/lib/ladder";
import type { RungName, RungScores } from "@/lib/ladder";
import { RungBreakdown } from "@/components/RungBreakdown";

type Finding = {
  title: string;
  impact: string;
  fix: string;
  category: string;
  region: string;
  uplift: number;
  targetLevel: string;
  rung?: string;
};

type ScoreResult = {
  score: number;
  label: string;
  summary: string;
  next: string;
  findings: Finding[];
  rungs?: RungScores;
};

type Screenshot = {
  label: string;
  image: string;
};

type PastScore = {
  id: string;
  score: number;
  label: string;
  summary: string;
  thumbnail: string;
  source: string;
  timestamp: number;
};


function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-widest text-muted border border-[#333] px-2 py-0.5">
      {category}
    </span>
  );
}

function ScannerCorners() {
  return (
    <>
      <span className="scanner-corner scanner-corner-tl" />
      <span className="scanner-corner scanner-corner-tr" />
      <span className="scanner-corner scanner-corner-bl" />
      <span className="scanner-corner scanner-corner-br" />
    </>
  );
}

function AnimatedScore({ target }: { target: number }) {
  const [value, setValue] = useState(0);
  const color = getScoreColor(target);

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(ease * target);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target]);

  return (
    <span className="font-mono font-bold text-[4rem] leading-none tabular-nums" style={{ color }}>
      {value.toFixed(1)}
    </span>
  );
}

/* ── Social share helpers ── */
function ShareButtons({ score, label, summary }: { score: number; label: string; summary: string }) {
  const text = `My Screen Score: ${score.toFixed(1)} (${label}). ${summary}`;
  const url = "https://runladder.com/score";

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] text-muted uppercase tracking-widest mr-1">Share</span>
      {/* X/Twitter */}
      <a
        href={`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted hover:text-foreground transition-colors"
        title="Share on X"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      {/* LinkedIn */}
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted hover:text-foreground transition-colors"
        title="Share on LinkedIn"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </a>
      {/* Copy link */}
      <button
        onClick={() => {
          navigator.clipboard.writeText(`${text}\n\nScore yours at ${url}`);
        }}
        className="text-muted hover:text-foreground transition-colors"
        title="Copy to clipboard"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      </button>
    </div>
  );
}

/* ── Past scores from localStorage ── */
function loadPastScores(): PastScore[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("ladder_past_scores");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePastScore(entry: PastScore) {
  const scores = loadPastScores();
  // Prevent duplicates
  const exists = scores.find((s) => s.id === entry.id);
  if (exists) return;
  scores.unshift(entry);
  // Keep max 20
  if (scores.length > 20) scores.length = 20;
  localStorage.setItem("ladder_past_scores", JSON.stringify(scores));
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ScorePage() {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [urlInput, setUrlInput] = useState("");
  const [urlScreenshots, setUrlScreenshots] = useState<Screenshot[]>([]);
  const [selectedShot, setSelectedShot] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanPhase, setScanPhase] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pastScores, setPastScores] = useState<PastScore[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load past scores on mount
  useEffect(() => {
    setPastScores(loadPastScores());
  }, []);

  const scanMessages = [
    "Initializing Ladder engine",
    "Extracting visual hierarchy",
    "Mapping interaction patterns",
    "Evaluating spacing system",
    "Scoring against framework",
    "Generating findings",
  ];

  const captureMessages = [
    "Connecting to site",
    "Rendering page",
    "Capturing screenshots",
  ];

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
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
    setUrlScreenshots([]);
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function captureUrl() {
    if (!urlInput.trim()) return;
    setCapturing(true);
    setError(null);
    setImage(null);
    setUrlScreenshots([]);
    setScanPhase(0);

    const interval = setInterval(() => {
      setScanPhase((p) => Math.min(p + 1, captureMessages.length - 1));
    }, 3000);

    try {
      const res = await fetch("/api/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("Screenshot service returned an unexpected response. Please try again."); }
      if (!res.ok) throw new Error(data.error || "Screenshot failed");

      setUrlScreenshots(data.screenshots);
      setSelectedShot(0);
      if (data.screenshots.length > 0) {
        setImage(data.screenshots[0].image);
        setFileName(data.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to capture website");
    } finally {
      clearInterval(interval);
      setCapturing(false);
    }
  }

  function selectScreenshot(index: number) {
    setSelectedShot(index);
    setImage(urlScreenshots[index].image);
    setResult(null);
  }

  async function scoreImage(img?: string) {
    const imageToScore = img || image;
    if (!imageToScore) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setScanPhase(0);
    if (img) setImage(img);

    const interval = setInterval(() => {
      setScanPhase((p) => (p + 1) % scanMessages.length);
    }, 2200);

    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageToScore }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("Scoring service returned an unexpected response. Please try again."); }
      if (!res.ok) throw new Error(data.error || "Scoring failed");
      setResult(data);

      // Save to past scores
      const entry: PastScore = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        score: data.score,
        label: data.label,
        summary: data.summary,
        thumbnail: imageToScore.slice(0, 200), // Store tiny prefix for identification
        source: fileName || "Upload",
        timestamp: Date.now(),
      };
      savePastScore(entry);
      setPastScores(loadPastScores());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  function reset() {
    setImage(null);
    setFileName("");
    setUrlInput("");
    setUrlScreenshots([]);
    setSelectedShot(0);
    setResult(null);
    setError(null);
  }

  const nextLevel = result ? getNextLevel(result.score) : "";
  const gap = result ? getGapToNext(result.score).toFixed(1) : "";

  const hasInput = image || urlScreenshots.length > 0;
  const showUploadUI = !result && !loading && !capturing;

  return (
    <div className="analysis-grid pt-20 font-mono">
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">

        {/* ── Header bar ── */}
        {result && (
          <div className="flex items-center justify-between mb-10 border-b border-[#333] pb-4">
            <ShareButtons score={result.score} label={result.label} summary={result.summary} />
            <div className="flex items-center gap-4">
              <button
                onClick={reset}
                className="text-[11px] uppercase tracking-widest text-ladder-green border border-ladder-green/30 px-4 py-2 hover:bg-ladder-green/10 transition-colors"
              >
                New analysis
              </button>
            </div>
          </div>
        )}

        {/* ── Input: drop zone + URL field ── */}
        {showUploadUI && !hasInput && (
          <div className="max-w-2xl mx-auto">
            {/* Headline */}
            <div className="text-center mb-10 font-sans">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight tracking-tight">
                Every satisfying app you love<br />
                <span className="text-ladder-green">earned its score.</span>
              </h1>
              <p className="text-sm text-body mt-4 max-w-md mx-auto leading-relaxed">
                Drop a screen. Get the number. See exactly what to fix, and what level your experience is really at.
              </p>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onClick={() => fileRef.current?.click()}
              className={`relative border cursor-pointer transition-all duration-200 ${
                isDragOver
                  ? "border-ladder-green bg-ladder-green/5"
                  : "border-[#333] hover:border-muted bg-[#1e1e1e]"
              }`}
            >
              <ScannerCorners />
              <div className="p-16 text-center">
                <div className="mb-6">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6AC89B" strokeWidth="1" className="mx-auto opacity-60">
                    <rect x="3" y="3" width="18" height="18" rx="0" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </div>
                <p className="text-sm text-body mb-2">
                  Add or drag in a screenshot
                </p>
                <p className="text-[11px] text-muted tracking-wide">
                  PNG / JPG / WebP &middot; up to 10MB
                </p>
                <p className="text-[10px] text-[#555] mt-4 max-w-xs mx-auto leading-relaxed">
                  By scoring, you agree to our{" "}
                  <a href="/terms" className="text-ladder-green hover:text-ladder-green/80 transition-colors">Terms</a>{" "}
                  and{" "}
                  <a href="/privacy" className="text-ladder-green hover:text-ladder-green/80 transition-colors">Privacy Policy</a>.
                  Free scores may be published on runladder.com.{" "}
                  <a href="/pricing" className="text-ladder-green hover:text-ladder-green/80 transition-colors">Upgrade</a>{" "}
                  for private evaluations.
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* URL field */}
            <div className="mt-4 flex gap-3">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && captureUrl()}
                placeholder="Or enter a URL to capture"
                className="flex-1 bg-[#1e1e1e] border border-[#333] text-sm text-foreground px-4 py-3 placeholder:text-[#444] focus:border-ladder-green/50 focus:outline-none transition-colors"
              />
              <button
                onClick={captureUrl}
                disabled={!urlInput.trim()}
                className="bg-ladder-green text-[#1a1a1a] font-bold text-xs uppercase tracking-widest px-6 py-3 hover:bg-ladder-green/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Capture
              </button>
            </div>

            {/* ── Past scores ── */}
            {pastScores.length > 0 && (
              <div className="mt-12 border-t border-[#333] pt-8">
                <span className="text-[10px] text-muted uppercase tracking-widest">Recent scores</span>
                <div className="mt-4 space-y-2">
                  {pastScores.slice(0, 8).map((ps) => (
                    <div
                      key={ps.id}
                      className="flex items-center gap-4 border border-[#333] bg-[#1e1e1e] p-3 hover:border-muted transition-colors"
                    >
                      <span
                        className="text-lg font-bold tabular-nums w-12 text-center"
                        style={{ color: getScoreColor(ps.score) }}
                      >
                        {ps.score.toFixed(1)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] text-foreground truncate block">{ps.source}</span>
                        <span className="text-[10px] text-muted truncate block">{ps.summary}</span>
                      </div>
                      <span className="text-[10px] text-[#444] flex-shrink-0">{timeAgo(ps.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Capturing URL state ── */}
        {capturing && (
          <div className="max-w-2xl mx-auto">
            <div className="border border-[#333] bg-[#1e1e1e] p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex gap-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
                <span className="text-[11px] text-ladder-green uppercase tracking-widest">
                  Capturing {urlInput}
                </span>
              </div>
              <div className="space-y-2">
                {captureMessages.map((msg, i) => (
                  <div
                    key={msg}
                    className={`flex items-center gap-3 text-[11px] tracking-wide transition-all duration-300 ${
                      i < scanPhase ? "text-muted" : i === scanPhase ? "text-ladder-green" : "text-[#333]"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 flex-shrink-0 ${
                      i < scanPhase ? "bg-muted" : i === scanPhase ? "bg-ladder-green" : "bg-[#333]"
                    }`} />
                    {msg}
                    {i < scanPhase && <span className="text-muted ml-auto">done</span>}
                    {i === scanPhase && <span className="text-ladder-green ml-auto animate-pulse">...</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Screenshot preview (upload) ── */}
        {showUploadUI && image && urlScreenshots.length === 0 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="relative border border-[#333] bg-[#1e1e1e] p-1">
              <ScannerCorners />
              <img src={image} alt="Screenshot to score" className="w-full max-h-[420px] object-contain" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-muted tracking-wide truncate max-w-xs">{fileName}</span>
                <button onClick={reset} className="text-[11px] text-muted hover:text-body uppercase tracking-widest transition-colors">
                  Remove
                </button>
              </div>
              <button
                onClick={() => scoreImage()}
                className="bg-ladder-green text-[#1a1a1a] font-bold text-xs uppercase tracking-widest px-8 py-3 hover:bg-ladder-green/90 transition-colors"
              >
                Score this screen
              </button>
            </div>
          </div>
        )}

        {/* ── Screenshot selection (URL captures) ── */}
        {showUploadUI && urlScreenshots.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-ladder-green uppercase tracking-widest">
                  {urlScreenshots.length} screenshots captured
                </span>
                <span className="text-[11px] text-muted truncate max-w-sm">{fileName}</span>
              </div>
              <button onClick={reset} className="text-[11px] text-muted hover:text-body uppercase tracking-widest transition-colors">
                Start over
              </button>
            </div>

            {/* Thumbnail strip with score buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {urlScreenshots.map((shot, i) => (
                <div
                  key={i}
                  className={`relative border bg-[#1e1e1e] transition-all ${
                    selectedShot === i
                      ? "border-ladder-green"
                      : "border-[#333] hover:border-muted"
                  }`}
                >
                  <button
                    onClick={() => selectScreenshot(i)}
                    className="w-full text-left"
                  >
                    <img src={shot.image} alt={shot.label} className="w-full h-28 object-cover object-top p-0.5" />
                    <div className="px-2 pt-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-muted tracking-wide">{shot.label}</span>
                      {selectedShot === i && (
                        <span className="w-1.5 h-1.5 bg-ladder-green flex-shrink-0" />
                      )}
                    </div>
                  </button>
                  <div className="px-2 pb-2 pt-1.5">
                    <button
                      onClick={() => {
                        setSelectedShot(i);
                        setImage(shot.image);
                        setFileName(urlInput.trim());
                        scoreImage(shot.image);
                      }}
                      className="w-full bg-ladder-green/10 border border-ladder-green/30 text-ladder-green text-[10px] uppercase tracking-widest py-1.5 hover:bg-ladder-green/20 transition-colors"
                    >
                      Score this screen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Scanning state ── */}
        {loading && image && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="relative border border-ladder-green/30 bg-[#1e1e1e] p-1 scanner-active">
              <ScannerCorners />
              <img src={image} alt="Scanning" className="w-full max-h-[420px] object-contain opacity-70" />
            </div>
            <div className="border border-[#333] bg-[#1e1e1e] p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex gap-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
                <span className="text-[11px] text-ladder-green uppercase tracking-widest">Analyzing</span>
              </div>
              <div className="space-y-2">
                {scanMessages.map((msg, i) => (
                  <div
                    key={msg}
                    className={`flex items-center gap-3 text-[11px] tracking-wide transition-all duration-300 ${
                      i < scanPhase ? "text-muted" : i === scanPhase ? "text-ladder-green" : "text-[#333]"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 flex-shrink-0 ${
                      i < scanPhase ? "bg-muted" : i === scanPhase ? "bg-ladder-green" : "bg-[#333]"
                    }`} />
                    {msg}
                    {i < scanPhase && <span className="text-muted ml-auto">done</span>}
                    {i === scanPhase && <span className="text-ladder-green ml-auto animate-pulse">...</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {result && (
          <div className="space-y-10 animate-fade-up">

            {/* Score hero: screen left, score right */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
              {/* Left: screenshot + URL thumbnails if applicable */}
              <div className="space-y-3">
                <div className="relative border border-[#333] bg-[#1e1e1e] p-1">
                  <ScannerCorners />
                  <img src={image!} alt="Analyzed screenshot" className="w-full max-h-[420px] object-contain" />
                </div>

                {/* URL thumbnail strip under left panel */}
                {urlScreenshots.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {urlScreenshots.map((shot, i) => (
                      <div key={i} className="relative">
                        <button
                          onClick={() => selectScreenshot(i)}
                          className={`w-full border bg-[#1e1e1e] transition-all ${
                            selectedShot === i ? "border-ladder-green" : "border-[#333] hover:border-muted"
                          }`}
                        >
                          <img src={shot.image} alt={shot.label} className="w-full h-16 object-cover object-top" />
                          {selectedShot === i && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-ladder-green" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedShot(i);
                            setImage(shot.image);
                            setFileName(urlInput.trim() || fileName);
                            scoreImage(shot.image);
                          }}
                          className="w-full text-[9px] text-ladder-green uppercase tracking-widest mt-1 hover:text-ladder-green/80 transition-colors"
                        >
                          Score
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: score panel */}
              <div className="border border-[#333] bg-[#1e1e1e] p-8 flex flex-col">
                <span className="text-[10px] text-muted uppercase tracking-widest mb-6">Screen Score</span>
                <div className="flex-1 flex flex-col items-start justify-center">
                  <AnimatedScore target={result.score} />
                  <span className="text-sm font-bold uppercase tracking-widest mt-1" style={{ color: getScoreColor(result.score) }}>
                    {result.label}
                  </span>

                  <div className="mt-6 pt-4 border-t border-[#333] w-full">
                    <span className="text-[10px] text-muted uppercase tracking-widest">Gap to {nextLevel}</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-lg font-bold" style={{ color: getLevelColor(nextLevel) }}>+{gap}</span>
                      <span className="text-[11px] text-muted">points</span>
                    </div>
                  </div>

                  <div className="mt-6 w-full">
                    <div className="h-1.5 bg-[#333] w-full">
                      <div
                        className="h-full transition-all duration-700 ease-out"
                        style={{ width: `${(result.score / 5) * 100}%`, background: getScoreColor(result.score) }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-[#444]">
                      <span>1.0</span><span>2.0</span><span>3.0</span><span>4.0</span><span>5.0</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-body leading-relaxed mt-6 border-t border-[#333] pt-4">
                  {result.summary}
                </p>
                <p className="text-[10px] text-muted mt-3">
                  This is a Screen Score: what the interface shows. Want to know how it actually feels?{" "}
                  <a href="/pulse" className="text-ladder-green hover:text-ladder-green/80 transition-colors">That takes Pulse.</a>
                </p>
              </div>
            </div>

            {/* Rung breakdown */}
            {result.rungs && (
              <div className="border border-[#333] bg-[#1e1e1e] p-6 md:p-8">
                <RungBreakdown rungs={result.rungs} />
              </div>
            )}

            {/* Next step banner */}
            <div className="border border-ladder-green/20 bg-[#1e1e1e] p-5 flex items-start gap-4">
              <span className="text-ladder-green text-sm mt-0.5">&#8594;</span>
              <div>
                <span className="text-[10px] text-ladder-green uppercase tracking-widest">Fix this first</span>
                <p className="text-sm text-foreground leading-relaxed mt-1">{result.next}</p>
              </div>
            </div>

            {/* Findings */}
            {result.findings && result.findings.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-[10px] text-muted uppercase tracking-widest">Findings</span>
                  <span className="text-[10px] text-[#444]">{result.findings.length} issues ranked by impact</span>
                </div>

                {result.findings.map((f, i) => (
                  <div
                    key={i}
                    className="border border-[#333] bg-[#1e1e1e] p-6 animate-fade-up"
                    style={{ animationDelay: `${i * 0.1}s`, opacity: 0 }}
                  >
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0 w-8 h-8 border border-[#444] flex items-center justify-center text-xs text-muted">
                        {i + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <h4 className="text-sm font-bold text-foreground">{f.title}</h4>
                          <CategoryBadge category={f.category} />
                          {f.rung && (() => {
                            const level = getRungLevel(f.rung as RungName);
                            return (
                              <span
                                className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border"
                                style={{ color: level.color, borderColor: level.color + "40" }}
                              >
                                {level.label}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-body leading-relaxed mb-3">{f.impact}</p>
                        <div className="border-t border-[#2a2a2a] pt-3 mt-3">
                          <p className="text-xs text-foreground leading-relaxed">{f.fix}</p>
                        </div>
                        {f.region && (
                          <p className="text-[10px] text-[#555] mt-3 tracking-wide">Region: {f.region}</p>
                        )}
                      </div>

                      {f.uplift && (
                        <div className="flex-shrink-0 text-right">
                          <span className="text-lg font-bold" style={{ color: getLevelColor(f.targetLevel) }}>
                            +{f.uplift.toFixed(1)}
                          </span>
                          <p className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: getLevelColor(f.targetLevel) }}>
                            {f.targetLevel}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="border border-[#333] bg-[#1e1e1e] p-5 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted uppercase tracking-widest">
                      Potential score if all findings addressed
                    </span>
                    <span
                      className="text-xl font-bold"
                      style={{ color: getScoreColor(
                        Math.min(5, result.score + (result.findings?.reduce((s, f) => s + (f.uplift || 0), 0) || 0))
                      )}}
                    >
                      {Math.min(5, result.score + (result.findings?.reduce((s, f) => s + (f.uplift || 0), 0) || 0)).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-6 text-xs text-ladder-red text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
