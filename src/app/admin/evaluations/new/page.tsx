"use client";

import { useRef, useState } from "react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

type UploadedImage = {
  name: string;
  dataUrl: string;
  preview: string;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NewEvaluationPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [mode, setMode] = useState<"sample" | "audit">("sample");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const newImages: UploadedImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await readFileAsDataUrl(file);
      newImages.push({ name: file.name, dataUrl, preview: dataUrl });
    }
    setImages((prev) => [...prev, ...newImages]);
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) return setError("Client name required");
    if (!projectName.trim()) return setError("Project name required");
    if (!images.length) return setError("At least one screen required");

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          projectName: projectName.trim(),
          mode,
          images: images.map((img) => img.dataUrl),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Create failed (${res.status})`);
      router.push(`/admin/evaluations/${json.evaluation.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
      setSubmitting(false);
    }
  }

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Nav */}
        <div className="mb-8">
          <div className="text-[10px] uppercase tracking-widest text-muted mb-1 font-sans">
            <Link href="/admin" className="hover:text-foreground transition-colors">Admin</Link>
            <span className="mx-1.5">/</span>
            <Link href="/admin/evaluations" className="hover:text-foreground transition-colors">Evaluations</Link>
            <span className="mx-1.5">/</span>
            <span className="text-foreground">New</span>
          </div>
          <h1 className="text-xl text-foreground font-sans">New evaluation</h1>
        </div>

        {error && (
          <div className="mb-6 border border-red-500/40 bg-red-500/5 text-red-400 text-xs font-sans p-3">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-6">
          {/* Client + project */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted mb-1.5">
                Client name
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-3 py-2 focus:outline-none focus:border-muted placeholder:text-[#555] font-sans"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted mb-1.5">
                Project / screen
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Onboarding flow"
                className="w-full bg-[#111] border border-[#333] text-sm text-foreground px-3 py-2 focus:outline-none focus:border-muted placeholder:text-[#555] font-sans"
              />
            </div>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
              Report type
            </label>
            <div className="flex gap-3">
              {(["sample", "audit"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-4 py-2 text-xs font-semibold border transition-colors ${
                    mode === m
                      ? "border-ladder-green bg-ladder-green/10 text-ladder-green"
                      : "border-[#333] text-muted hover:border-muted hover:text-foreground"
                  }`}
                >
                  {m === "sample" ? "Sample report" : "Full audit"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted font-sans mt-1.5">
              {mode === "sample"
                ? "3–5 findings. Free post-call deliverable + pitch for what's next."
                : "4–8 findings per screen. Full paid audit deliverable."}
            </p>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted mb-2">
              Screens ({images.length})
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-[#444] bg-[#111] p-8 text-center cursor-pointer hover:border-muted transition-colors"
            >
              <p className="text-sm text-muted font-sans">
                Drop screenshots here or click to upload
              </p>
              <p className="text-[11px] text-[#555] font-sans mt-1">
                PNG, JPG, WebP — multiple files supported
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.preview}
                      alt={img.name}
                      className="w-full aspect-video object-cover border border-[#333]"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-background/80 text-foreground text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400"
                    >
                      ×
                    </button>
                    <p className="text-[10px] text-muted mt-1 truncate font-sans">{img.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="text-sm font-semibold bg-ladder-green text-background px-6 py-2 rounded-sm hover:bg-ladder-green/90 transition-colors disabled:opacity-40"
            >
              {submitting ? "Creating…" : "Create evaluation"}
            </button>
            <Link
              href="/admin/evaluations"
              className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
