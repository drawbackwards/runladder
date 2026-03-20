"use client";

import { useState } from "react";

const INTERESTS = [
  "Organization plan for my team",
  "Enterprise & API access",
  "Ladder Pulse deployment",
  "Drawbackwards Consulting",
  "Partnership or integration",
  "Something else",
];

export function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    interest: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;

    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Send failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="border border-ladder-green/30 bg-ladder-green/5 rounded-xl p-10 text-center">
        <p className="text-lg font-bold text-foreground mb-3">
          We&apos;ll be in touch soon.
        </p>
        <p className="text-sm text-body leading-relaxed max-w-md mx-auto">
          Thanks for reaching out. Someone from our team will get back to
          you within one business day. In the meantime, try scoring a
          screen. It&apos;s free.
        </p>
        <a
          href="/score"
          className="inline-block mt-6 text-sm font-semibold bg-ladder-green text-background px-8 py-3 rounded-full hover:bg-ladder-green/90 transition-colors"
        >
          Score a screen
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
            Name *
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-ladder-green/50 focus:outline-none transition-colors"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
            Email *
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-ladder-green/50 focus:outline-none transition-colors"
            placeholder="you@company.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
          Company
        </label>
        <input
          type="text"
          value={form.company}
          onChange={(e) => update("company", e.target.value)}
          className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-ladder-green/50 focus:outline-none transition-colors"
          placeholder="Where you work"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
          What are you interested in?
        </label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => update("interest", form.interest === opt ? "" : opt)}
              className={`text-xs px-4 py-2 rounded-full border transition-colors ${
                form.interest === opt
                  ? "border-ladder-green bg-ladder-green/10 text-ladder-green"
                  : "border-border text-body hover:border-muted hover:text-foreground"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
          Tell us what you need *
        </label>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          className="w-full bg-card border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-ladder-green/50 focus:outline-none transition-colors resize-none"
          placeholder="What are you building? What does your team look like? What would having a quality score change for you?"
        />
      </div>

      <button
        type="submit"
        disabled={status === "sending" || !form.name || !form.email || !form.message}
        className="bg-ladder-green text-background font-semibold px-10 py-4 rounded-full hover:bg-ladder-green/90 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === "sending" ? "Sending..." : "Start the conversation"}
      </button>

      {status === "error" && (
        <p className="text-sm text-red-400">
          Something went wrong. Please try again or email us directly at{" "}
          <a href="mailto:hello@drawbackwards.com" className="underline">
            hello@drawbackwards.com
          </a>
        </p>
      )}
    </form>
  );
}
