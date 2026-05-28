"use client";

import { usePathname } from "next/navigation";
import { TabButton } from "@/components/Tabs";

/**
 * Layout for the tabbed admin pages (Clients / Evaluations / Feedback / Comps
 * / Beta Codes). Owns the "Admin" header and the tab bar.
 *
 * Auth gating happens in the parent `src/app/admin/layout.tsx`. Drill-in
 * sub-pages (e.g. `/admin/clients/new`, `/admin/evaluations/new`) live
 * OUTSIDE this route group on purpose, so they don't inherit the tabs and can
 * render their own back-link + heading.
 */

const TABS = [
  { label: "Clients", href: "/admin/clients" },
  { label: "Evaluations", href: "/admin/evaluations" },
  { label: "Feedback", href: "/admin/feedback" },
  { label: "Comps", href: "/admin/comps" },
  { label: "Beta Codes", href: "/admin/beta-codes" },
] as const;

export default function AdminTabbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-xl text-foreground font-sans">Admin</h1>
        </div>
        <div className="border-b border-[#2a2a2a] flex items-center gap-2 mb-8 overflow-x-auto">
          {TABS.map((t) => (
            <TabButton
              key={t.href}
              label={t.label}
              href={t.href}
              active={pathname.startsWith(t.href)}
            />
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
