"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Dev-only tooling for dashboard work. Two independent things:
 *
 *  1. "View as" (Dev Mode) — preview the Personal/Team dashboard layouts as a
 *     fixture Plan (Free/Pro/Team) and, on Team, a Role (Designer/Lead·empty/
 *     Lead·active). "My Account" = your real data (state is null).
 *
 *  2. "Admin" override — only relevant on My Account: lets a teammate who isn't
 *     in ADMIN_EMAILS work on the Admin section locally. Sets a cookie that the
 *     server's getAdminEmail() honors (dev only). Independent of the fixtures —
 *     admins are Drawbackwards members, not a previewed tier.
 *
 * Gated on NODE_ENV: `next dev` → enabled; any production build (incl. Vercel
 * preview) → disabled, so useViewAs() returns null, the switcher renders
 * nothing, and the server bypass is dead code. State is React context (the
 * Admin flag also mirrors to a cookie); no URL params, so no Suspense needs.
 */
export const VIEW_AS_ENABLED = process.env.NODE_ENV !== "production";

export const DEV_ADMIN_COOKIE = "ladder_dev_admin";

export const VIEW_AS_PLANS = ["free", "pro", "team"] as const;
export type ViewAsPlan = (typeof VIEW_AS_PLANS)[number];
export const VIEW_AS_PLAN_LABELS: Record<ViewAsPlan, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
};

export const VIEW_AS_ROLES = ["designer", "lead-empty", "lead-active"] as const;
export type ViewAsRole = (typeof VIEW_AS_ROLES)[number];
export const VIEW_AS_ROLE_LABELS: Record<ViewAsRole, string> = {
  designer: "Designer",
  "lead-empty": "Lead · empty",
  "lead-active": "Lead · active",
};

export type ViewAsState = {
  plan: ViewAsPlan;
  /** Only meaningful on the Team plan; null for Free/Pro individuals. */
  role: ViewAsRole | null;
};

type ViewAsContextValue = {
  /** null = "My Account" (real data). */
  state: ViewAsState | null;
  /** Dev admin override — only applies on My Account. */
  devAdmin: boolean;
  enterDevMode: () => void;
  exitDevMode: () => void;
  setPlan: (plan: ViewAsPlan) => void;
  setRole: (role: ViewAsRole) => void;
  setDevAdmin: (on: boolean) => void;
};

const ViewAsContext = createContext<ViewAsContextValue | null>(null);
const DEFAULT_STATE: ViewAsState = { plan: "free", role: null };

function writeCookie(on: boolean) {
  if (typeof document === "undefined") return;
  document.cookie = on
    ? `${DEV_ADMIN_COOKIE}=1; path=/; SameSite=Lax`
    : `${DEV_ADMIN_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
}

function readCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((c) => c === `${DEV_ADMIN_COOKIE}=1`);
}

export function ViewAsProvider({ children }: { children: ReactNode }) {
  // Default is always "My Account" on load (no view persistence) so fixtures
  // never masquerade as real data after a refresh. Fast Refresh keeps state
  // during edit-iteration. The Admin flag persists via its cookie.
  const [state, setState] = useState<ViewAsState | null>(null);
  const [devAdmin, setDevAdminState] = useState(false);

  useEffect(() => {
    // Hydrate from the cookie on mount. Reading document during SSR render
    // would cause a hydration mismatch, so this client-only effect is correct.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (VIEW_AS_ENABLED) setDevAdminState(readCookie());
  }, []);

  const value: ViewAsContextValue = {
    state: VIEW_AS_ENABLED ? state : null,
    devAdmin: VIEW_AS_ENABLED ? devAdmin : false,
    enterDevMode: () => setState((s) => s ?? DEFAULT_STATE),
    exitDevMode: () => setState(null),
    setPlan: (plan) =>
      setState((s) => {
        const base = s ?? DEFAULT_STATE;
        if (plan === "team") return { plan, role: base.role ?? "designer" };
        return { plan, role: null };
      }),
    setRole: (role) =>
      setState((s) => (s && s.plan === "team" ? { ...s, role } : s)),
    setDevAdmin: (on) => {
      writeCookie(on);
      setDevAdminState(on);
    },
  };

  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>;
}

/** Read the active fixture override (null = My Account / real data, or disabled). */
export function useViewAs(): ViewAsState | null {
  return useContext(ViewAsContext)?.state ?? null;
}

/** The dev admin override (My Account only). False when disabled. */
export function useDevAdmin(): boolean {
  return useContext(ViewAsContext)?.devAdmin ?? false;
}

/** Controls for the dev switcher. Null if rendered outside the provider. */
export function useViewAsControls(): ViewAsContextValue | null {
  return useContext(ViewAsContext);
}
