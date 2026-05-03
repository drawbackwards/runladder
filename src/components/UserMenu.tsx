"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { isPaidTier, type Tier } from "@/lib/plans";

const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
  pulse: "Pulse",
};

export function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!isLoaded || !user) return null;

  const tier: Tier =
    (user.publicMetadata?.tier as Tier | undefined) ?? "free";
  const paid = isPaidTier(tier);
  const tierLabel = TIER_LABEL[tier];

  const fullName = user.fullName || user.firstName || "Account";
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const initial = (
    user.firstName?.[0] ||
    user.lastName?.[0] ||
    email[0] ||
    "?"
  ).toUpperCase();
  const onDashboard = pathname?.startsWith("/dashboard") ?? false;

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } catch {
      setPortalLoading(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className={`group flex items-center gap-2 rounded-full pl-0.5 pr-2 py-0.5 transition-colors ${
          open ? "bg-[#222]" : "hover:bg-[#1f1f1f]"
        }`}
      >
        <span
          className={`relative block w-8 h-8 rounded-full overflow-hidden bg-[#1f1f1f] ${
            paid
              ? "ring-1 ring-ladder-green ring-offset-2 ring-offset-background"
              : ""
          }`}
        >
          {user.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center bg-ladder-green/15 text-ladder-green text-xs font-semibold uppercase">
              {initial}
            </span>
          )}
        </span>
        {paid && (
          <span className="text-[9px] font-mono font-semibold uppercase tracking-widest text-ladder-green border border-ladder-green/40 bg-ladder-green/5 px-1.5 py-0.5 leading-none">
            {tierLabel}
          </span>
        )}
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
          className={`text-muted group-hover:text-foreground transition-all ${
            open ? "rotate-180 text-foreground" : ""
          }`}
        >
          <polyline
            points="3,5 6,8 9,5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-[calc(100%+10px)] w-72 border border-[#2a2a2a] bg-[#161616] shadow-2xl shadow-black/50 origin-top-right user-menu-pop"
        >
          <div className="px-4 py-3.5 border-b border-[#2a2a2a]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-foreground font-sans font-semibold truncate">
                  {fullName}
                </p>
                {email && (
                  <p className="text-[11px] text-muted font-sans truncate mt-0.5">
                    {email}
                  </p>
                )}
              </div>
              <span
                className={`flex-shrink-0 text-[9px] font-mono font-semibold uppercase tracking-widest px-1.5 py-0.5 leading-none border ${
                  paid
                    ? "text-ladder-green border-ladder-green/40 bg-ladder-green/5"
                    : "text-muted border-[#333]"
                }`}
              >
                {tierLabel}
              </span>
            </div>
          </div>

          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center justify-between px-4 py-3 bg-ladder-green/[0.06] hover:bg-ladder-green/10 border-b border-[#2a2a2a] transition-colors group"
          >
            <span className="flex items-center gap-2.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
                className="text-ladder-green"
              >
                <rect x="2" y="2" width="5" height="5" />
                <rect x="9" y="2" width="5" height="5" />
                <rect x="2" y="9" width="5" height="5" />
                <rect x="9" y="9" width="5" height="5" />
              </svg>
              <span className="text-sm text-foreground font-sans font-semibold">
                Dashboard
              </span>
              {onDashboard && (
                <span className="text-[9px] text-ladder-green/70 font-mono uppercase tracking-widest">
                  Current
                </span>
              )}
            </span>
            <span className="text-ladder-green text-base group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </Link>

          <div className="py-1.5">
            {paid ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  handleManageBilling();
                }}
                disabled={portalLoading}
                role="menuitem"
                className="w-full text-left px-4 py-2 text-xs text-body font-sans hover:bg-[#1f1f1f] hover:text-foreground transition-colors flex items-center justify-between disabled:opacity-50"
              >
                <span>Manage subscription</span>
                <span className="text-muted text-[10px]">
                  {portalLoading ? "Opening…" : "Stripe ↗"}
                </span>
              </button>
            ) : (
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                role="menuitem"
                className="px-4 py-2 text-xs text-body font-sans hover:bg-[#1f1f1f] hover:text-foreground transition-colors flex items-center justify-between"
              >
                <span>Upgrade to Pro</span>
                <span className="text-ladder-green text-[10px] uppercase tracking-widest font-semibold">
                  $250/mo
                </span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openUserProfile();
              }}
              role="menuitem"
              className="w-full text-left px-4 py-2 text-xs text-body font-sans hover:bg-[#1f1f1f] hover:text-foreground transition-colors"
            >
              Account settings
            </button>
          </div>

          <div className="py-1.5 border-t border-[#2a2a2a]">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut({ redirectUrl: "/" });
              }}
              role="menuitem"
              className="w-full text-left px-4 py-2 text-xs text-muted font-sans hover:bg-[#1f1f1f] hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
