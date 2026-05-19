import Link from "next/link";
import { HQ_SECTIONS } from "@/content/hq/_sections";

export function HqSidebar({ isAdmin, email }: { isAdmin: boolean; email: string }) {
  return (
    <aside className="sticky top-24 self-start">
      <Link
        href="/hq"
        className="block text-xs font-bold uppercase tracking-widest text-ladder-green mb-6 hover:opacity-80"
      >
        Ladder HQ
      </Link>

      <nav className="space-y-1">
        {HQ_SECTIONS.map((section) => (
          <Link
            key={section.slug}
            href={`/hq/${section.slug}`}
            className="block text-sm text-body hover:text-foreground py-1.5 transition-colors"
          >
            {section.title}
          </Link>
        ))}
      </nav>

      <div className="mt-10 pt-6 border-t border-border text-[10px] text-muted font-sans space-y-1">
        <div>
          Signed in as{" "}
          <span className="text-body">{email}</span>
        </div>
        <div className="uppercase tracking-widest">
          {isAdmin ? "Admin" : "Team"}
        </div>
      </div>
    </aside>
  );
}
