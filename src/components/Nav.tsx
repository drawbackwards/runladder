import Link from "next/link";

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-mono font-bold text-base tracking-tight text-ladder-green">
            LADDER
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-10 text-sm font-bold text-body">
          <Link href="/framework" className="hover:text-foreground transition-colors">
            Framework
          </Link>
          <Link href="/products" className="hover:text-foreground transition-colors">
            Products
          </Link>
          <Link href="/top-100" className="hover:text-foreground transition-colors">
            Top 100
          </Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/api" className="hover:text-foreground transition-colors">
            API
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="text-sm font-bold text-body hover:text-foreground transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/score"
            className="text-sm font-semibold bg-ladder-green text-background px-8 py-3 rounded-full hover:bg-ladder-green/90 transition-colors"
          >
            Score a screen
          </Link>
        </div>
      </div>
    </nav>
  );
}
