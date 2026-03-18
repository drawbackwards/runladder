import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border py-12 mt-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="font-mono text-xs font-semibold text-muted uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/score" className="hover:text-foreground transition-colors">Score a screen</Link></li>
              <li><Link href="/framework" className="hover:text-foreground transition-colors">Framework</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link href="/api" className="hover:text-foreground transition-colors">API</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs font-semibold text-muted uppercase tracking-wider mb-4">
              Surfaces
            </h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/products" className="hover:text-foreground transition-colors">Ladder for Figma</Link></li>
              <li><Link href="/products" className="hover:text-foreground transition-colors">Ladder Pulse</Link></li>
              <li><Link href="/products" className="hover:text-foreground transition-colors">Ladder for Claude</Link></li>
              <li><Link href="/products" className="hover:text-foreground transition-colors">Ladder API</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs font-semibold text-muted uppercase tracking-wider mb-4">
              Content
            </h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/top-100" className="hover:text-foreground transition-colors">Top 100</Link></li>
              <li><Link href="/teardowns" className="hover:text-foreground transition-colors">Teardowns</Link></li>
              <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-xs font-semibold text-muted uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><a href="https://drawbackwards.com" className="hover:text-foreground transition-colors">Drawbackwards</a></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between pt-8 border-t border-border">
          <span className="font-mono text-xs text-muted">
            LADDER
          </span>
          <span className="text-xs text-muted/50">
            Built by Drawbackwards
          </span>
        </div>
      </div>
    </footer>
  );
}
