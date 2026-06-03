"use client";

import { usePathname } from "next/navigation";
import {
  VIEW_AS_ENABLED,
  VIEW_AS_PLANS,
  VIEW_AS_PLAN_LABELS,
  VIEW_AS_ROLES,
  VIEW_AS_ROLE_LABELS,
  useViewAsControls,
} from "@/lib/dev/view-as";

const BASE =
  "text-[10px] uppercase tracking-widest px-2.5 py-1 border transition-colors";

function chipCls(active: boolean, disabled: boolean): string {
  if (disabled) return `${BASE} opacity-30 cursor-not-allowed border-[#2a2a2a] text-[#555]`;
  if (active) return `${BASE} border-ladder-green text-ladder-green bg-ladder-green/10`;
  return `${BASE} border-[#333] text-muted hover:text-foreground hover:border-muted`;
}

const LABEL = "text-[9px] uppercase tracking-widest text-muted mb-1.5";

/**
 * Dev-only floating switcher. My Account vs Dev Mode; Dev Mode unlocks Plan →
 * Role fixtures; My Account unlocks the Admin override. Renders nothing in
 * production builds and only on /dashboard surfaces.
 */
export function ViewAsSwitcher() {
  const pathname = usePathname();
  const controls = useViewAsControls();

  if (!VIEW_AS_ENABLED || !controls) return null;
  if (!pathname?.startsWith("/dashboard")) return null;

  const { state, devAdmin, enterDevMode, exitDevMode, setPlan, setRole, setDevAdmin } =
    controls;
  const dev = !!state;
  const team = state?.plan === "team";
  const myAccount = !dev;

  return (
    <div className="fixed bottom-20 left-4 z-[9999] font-mono select-none">
      <div className="border border-[#3a3a3a] bg-[#141414]/95 backdrop-blur p-2.5 shadow-2xl shadow-black/60 w-[240px] space-y-2.5">
        {/* View — My Account vs Dev Mode */}
        <div>
          <p className={LABEL}>View</p>
          <div className="flex gap-1">
            <button
              onClick={exitDevMode}
              className={`${chipCls(myAccount, false)} flex-1`}
            >
              My Account
            </button>
            <button
              onClick={enterDevMode}
              className={`${chipCls(dev, false)} flex-1`}
            >
              Dev Mode
            </button>
          </div>
        </div>

        {/* Plan — Dev Mode only */}
        <div>
          <p className={LABEL}>Plan</p>
          <div className="flex gap-1">
            {VIEW_AS_PLANS.map((p) => (
              <button
                key={p}
                disabled={!dev}
                onClick={() => setPlan(p)}
                className={`${chipCls(state?.plan === p, !dev)} flex-1`}
              >
                {VIEW_AS_PLAN_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Role — Team plan only */}
        <div>
          <p className={LABEL}>Role</p>
          <div className="flex flex-wrap gap-1">
            {VIEW_AS_ROLES.map((r) => (
              <button
                key={r}
                disabled={!team}
                onClick={() => setRole(r)}
                className={chipCls(state?.role === r, !team)}
              >
                {VIEW_AS_ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Admin — My Account only (grants dev access to /admin) */}
        <div>
          <p className={LABEL}>Admin</p>
          <button
            disabled={!myAccount}
            onClick={() => setDevAdmin(!devAdmin)}
            className={`${chipCls(devAdmin, !myAccount)} w-full`}
          >
            Admin
          </button>
        </div>
      </div>
    </div>
  );
}
