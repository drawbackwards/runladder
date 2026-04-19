import Link from "next/link";
import { LadderLogo } from "./LadderLogo";

export function Footer() {
  return (
    <footer className="border-t border-border py-16 mt-36">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-5">
              Product
            </h4>
            <ul className="space-y-3 text-sm text-body">
              <li><Link href="/score" className="hover:text-foreground transition-colors">Score a screen</Link></li>
              <li><Link href="/framework" className="hover:text-foreground transition-colors">Framework</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-5">
              Surfaces
            </h4>
            <ul className="space-y-3 text-sm text-body">
              <li><Link href="/products" className="hover:text-foreground transition-colors">Ladder for Claude</Link></li>
              <li><Link href="/pulse" className="hover:text-foreground transition-colors">Ladder Pulse</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-5">
              Content
            </h4>
            <ul className="space-y-3 text-sm text-body">
              <li><Link href="/top-100" className="hover:text-foreground transition-colors">Top 100</Link></li>
              <li><Link href="/teardowns" className="hover:text-foreground transition-colors">Teardowns</Link></li>
              <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-5">
              Company
            </h4>
            <ul className="space-y-3 text-sm text-body">
              <li><a href="https://drawbackwards.com" className="hover:text-foreground transition-colors">Drawbackwards</a></li>
              <li><Link href="/organizations" className="hover:text-foreground transition-colors">How Ladder transforms organizations</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link></li>
              <li><Link href="/legal" className="hover:text-foreground transition-colors">Licensing &amp; IP</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-8 border-t border-border">
          <div className="flex items-center gap-4">
            <LadderLogo height={16} className="text-white/70" />
            <span className="text-xs text-muted">
              Made with love by <a href="https://drawbackwards.com" className="text-body hover:text-foreground transition-colors">Drawbackwards</a> since 2003
            </span>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            &copy; 2026 Drawbackwards, LLC. Ladder&trade; is a trademark of Drawbackwards, LLC. All rights reserved.
            The Ladder framework, scoring methodology, and associated materials are proprietary.{" "}
            <Link href="/legal" className="hover:text-foreground transition-colors">
              Licensing terms
            </Link>.
          </p>
        </div>
      </div>
    </footer>
  );
}
