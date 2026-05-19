import Link from "next/link";
import { HQ_SECTIONS } from "@/content/hq/_sections";

export default function HqIndex() {
  return (
    <div className="font-sans">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">Ladder HQ</h1>
        <p className="text-sm text-muted max-w-2xl">
          Internal team hub. Source of truth for the platform, the people,
          and the protocols. Every feature PR should touch the page that
          documents it.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HQ_SECTIONS.map((section) => (
          <Link
            key={section.slug}
            href={`/hq/${section.slug}`}
            className="block border border-border bg-card p-5 hover:border-ladder-green transition-colors"
          >
            <h2 className="text-base font-bold text-foreground mb-2">{section.title}</h2>
            <p className="text-sm text-body leading-snug">{section.intent}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
