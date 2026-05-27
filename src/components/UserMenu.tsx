"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useUser, useClerk, useOrganization } from "@clerk/nextjs";
import { isPaidTier, type Tier } from "@/lib/plans";

const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
  pulse: "Pulse",
};

const svgProps = {
  width: 15,
  height: 15,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  "aria-hidden": true,
} as const;

/** One icon per menu row, all on the same 16px grid for visual consistency. */
const ICON = {
  dashboard: (
    <svg {...svgProps}>
      <rect x="2" y="2" width="5" height="5" />
      <rect x="9" y="2" width="5" height="5" />
      <rect x="2" y="9" width="5" height="5" />
      <rect x="9" y="9" width="5" height="5" />
    </svg>
  ),
  team: (
    <svg {...svgProps}>
      <circle cx="5.5" cy="5.5" r="2.5" />
      <circle cx="11" cy="6" r="2" />
      <path d="M2 13c0-2 1.5-3.5 3.5-3.5S9 11 9 13" />
      <path d="M9.5 13c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5" />
    </svg>
  ),
  clients: (
    <svg {...svgProps}>
      <rect x="2" y="6" width="5" height="8" />
      <rect x="9" y="2" width="5" height="12" />
      <line x1="3.5" y1="9" x2="5.5" y2="9" />
      <line x1="10.5" y1="5" x2="12.5" y2="5" />
      <line x1="10.5" y1="8" x2="12.5" y2="8" />
    </svg>
  ),
  admin: (
    <svg {...svgProps} strokeLinejoin="round">
      <path d="M8 2l5 2v3.5c0 3-2.1 5.2-5 6-2.9-.8-5-3-5-6V4l5-2z" />
    </svg>
  ),
  billing: (
    <svg {...svgProps}>
      <rect x="2" y="3.5" width="12" height="9" rx="1" />
      <line x1="2" y1="6.5" x2="14" y2="6.5" />
      <line x1="4.5" y1="10" x2="8" y2="10" />
    </svg>
  ),
  settings: (
    <svg {...svgProps} strokeLinecap="round">
      <line x1="2" y1="4.5" x2="14" y2="4.5" />
      <circle cx="6" cy="4.5" r="1.5" fill="currentColor" stroke="none" />
      <line x1="2" y1="11.5" x2="14" y2="11.5" />
      <circle cx="10" cy="11.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  signout: (
    <svg {...svgProps} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2.5H3v11h3" />
      <path d="M10 5l3 3-3 3" />
      <line x1="13" y1="8" x2="6" y2="8" />
    </svg>
  ),
} as const;

/**
 * A single Account-menu row. Every row shares one layout — leading icon,
 * label, optional "Current" marker, optional right-aligned meta — whether it
 * navigates (href) or runs an action (onClick), so the menu reads as one
 * consistent list.
 */
function MenuRow({
  icon,
  label,
  href,
  onClick,
  meta,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  meta?: React.ReactNode;
  disabled?: boolean;
}) {
  const content = (
    <>
      <span className="flex items-center gap-2.5 min-w-0">
        <span className="text-muted group-hover:text-foreground transition-colors flex-shrink-0 flex">
          {icon}
        </span>
        <span className="text-sm text-foreground font-sans font-medium truncate">
          {label}
        </span>
      </span>
      {meta && <span className="flex-shrink-0">{meta}</span>}
    </>
  );
  const cls =
    "w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-[#1f1f1f] transition-colors group disabled:opacity-50";
  if (href) {
    return (
      <Link href={href} onClick={onClick} role="menuitem" className={cls}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      role="menuitem"
      className={cls}
    >
      {content}
    </button>
  );
}

export function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { organization } = useOrganization();
  const [open, setOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Resolve platform-admin status once the user is known. ADMIN_EMAILS lives
  // server-side, so we ask /api/admin/status rather than expose the allowlist.
  useEffect(() => {
    if (!isLoaded || !user) return;
    let active = true;
    fetch("/api/admin/status")
      .then((r) => (r.ok ? r.json() : { admin: false }))
      .then((d) => {
        if (active) setIsAdmin(d.admin === true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isLoaded, user]);

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

  // Only real Stripe-paying Pro users get the "Subscription" row (it opens the
  // Stripe customer portal). Comped users — including all Team/Pulse members,
  // who are comped via the Drawbackwards engagement — have no Stripe customer,
  // so the portal would fail to load (#204). Comp lives in publicMetadata;
  // Stripe IDs are server-only (privateMetadata), so this is the reliable
  // client-side signal. Team/Pulse/comped-Pro see no billing row (#201, #204).
  const comped = user.publicMetadata?.comp === true;
  const isStripePro = tier === "pro" && !comped;

  const fullName = user.fullName || user.firstName || "Account";
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const initial = (
    user.firstName?.[0] ||
    user.lastName?.[0] ||
    email[0] ||
    "?"
  ).toUpperCase();
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
        className={`group flex items-center gap-2 rounded-full px-2 py-0.5 transition-colors ${
          open ? "bg-[#222]" : "hover:bg-[#1f1f1f]"
        }`}
      >
        {paid && (
          <span className="mr-2 text-[9px] font-mono font-semibold uppercase tracking-widest text-ladder-green border border-ladder-green/40 bg-ladder-green/5 px-1.5 py-0.5 leading-none">
            {tierLabel}
          </span>
        )}
        <span
          className={`relative block w-8 h-8 rounded-full overflow-hidden bg-[#1f1f1f] ${
            paid
              ? "ring-1 ring-ladder-green ring-offset-2 ring-offset-background"
              : ""
          }`}
        >
          {user.hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center bg-ladder-green text-background text-xs font-semibold uppercase">
              {initial}
            </span>
          )}
        </span>
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
            <p className="text-sm text-foreground font-sans font-semibold truncate">
              {organization?.name ?? fullName}
            </p>
            {email && (
              <p className="text-[11px] text-muted font-sans truncate mt-0.5">
                {email}
              </p>
            )}
            <span
              className={`inline-block mt-2 text-[9px] font-mono font-semibold uppercase tracking-widest px-1.5 py-0.5 leading-none border ${
                paid
                  ? "text-ladder-green border-ladder-green/40 bg-ladder-green/5"
                  : "text-muted border-[#333]"
              }`}
            >
              {tierLabel}
            </span>
          </div>

          {/* Personal */}
          <div className="py-1.5">
            <MenuRow
              icon={ICON.dashboard}
              label="Dashboard"
              href="/dashboard"
              onClick={() => setOpen(false)}
            />
            {organization && (
              <MenuRow
                icon={ICON.team}
                label="Team"
                href="/dashboard/team"
                onClick={() => setOpen(false)}
              />
            )}
            {tier === "free" ? (
              <MenuRow
                icon={ICON.billing}
                label="Upgrade to Pro"
                href="/pricing"
                onClick={() => setOpen(false)}
                meta={
                  <span className="text-ladder-green text-[10px] uppercase tracking-widest font-semibold">
                    $1,000/mo
                  </span>
                }
              />
            ) : isStripePro ? (
              <MenuRow
                icon={ICON.billing}
                label="Subscription"
                onClick={() => {
                  setOpen(false);
                  handleManageBilling();
                }}
                disabled={portalLoading}
                meta={
                  <span className="text-muted text-[10px]">
                    {portalLoading ? "Opening…" : "Stripe ↗"}
                  </span>
                }
              />
            ) : null}
            <MenuRow
              icon={ICON.settings}
              label="Settings"
              onClick={() => {
                setOpen(false);
                openUserProfile();
              }}
            />
          </div>

          {/* Admin (platform admins only) */}
          {isAdmin && (
            <div className="py-1.5 border-t border-[#2a2a2a]">
              <MenuRow
                icon={ICON.clients}
                label="Clients"
                href="/admin/clients"
                onClick={() => setOpen(false)}
              />
              <MenuRow
                icon={ICON.admin}
                label="Admin"
                href="/admin"
                onClick={() => setOpen(false)}
              />
            </div>
          )}

          {/* Sign out */}
          <div className="py-1.5 border-t border-[#2a2a2a]">
            <MenuRow
              icon={ICON.signout}
              label="Sign out"
              onClick={() => {
                setOpen(false);
                signOut({ redirectUrl: "/" });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
