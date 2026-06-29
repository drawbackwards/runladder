"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import {
  useUser,
  useClerk,
  useReverification,
  RedirectToSignIn,
} from "@clerk/nextjs";
import { TabButton } from "@/components/Tabs";
import { ConfirmDialog } from "@/components/ConfirmDialog";

/**
 * Dedicated account settings page (#203), replacing Clerk's `openUserProfile()`
 * modal. A single page (no tabs) of stacked cards in the app's "Lego box"
 * style, so it reads consistently with the rest of the product instead of
 * Clerk's one-off modal chrome. Reached only from the Account menu, so there's
 * no back link — just a "Settings" title like Team / Manage Clients.
 *
 * Built on Clerk hooks rather than the `<UserProfile />` component on purpose:
 * styling that component to match our dark/tool aesthetic is a rabbit hole, and
 * a passwordless app only needs a thin surface (profile, the Google link, and
 * account deletion).
 */

const CARD = "border border-[#333] bg-[#1e1e1e] p-6";
const LABEL =
  "text-[9px] text-ladder-green uppercase tracking-widest font-semibold";
const INPUT =
  "w-full bg-[#111] border border-[#333] text-sm text-foreground px-2.5 py-2 focus:outline-none focus:border-ladder-green placeholder:text-[#555] font-sans";

/** True for a Google external account, whatever exact provider string Clerk uses. */
const isGoogleAccount = (a: { provider?: string }) =>
  (a.provider ?? "").includes("google");
const BTN_PRIMARY =
  "text-xs font-semibold bg-ladder-green text-[#1a1a1a] uppercase tracking-widest px-5 py-2.5 hover:bg-ladder-green-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const BTN_GHOST =
  "text-xs font-semibold text-foreground uppercase tracking-widest border border-[#333] px-5 py-2.5 hover:border-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

export default function SettingsPage() {
  const { isLoaded, isSignedIn } = useUser();
  const [tab, setTab] = useState<"profile" | "style-guide">("profile");

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl text-foreground font-sans">Settings</h1>
          <p className="text-xs text-muted font-sans mt-1">
            Your account, sign-in, and team style guide.
          </p>
        </div>

        <div className="border-b border-[#2a2a2a] flex items-center gap-2 mb-8">
          <TabButton
            label="Profile"
            active={tab === "profile"}
            onClick={() => setTab("profile")}
          />
          <TabButton
            label="Style Guide"
            active={tab === "style-guide"}
            onClick={() => setTab("style-guide")}
          />
        </div>

        {tab === "profile" ? (
          <div className="space-y-4">
            <ProfileCard />
            <GoogleCard />
            <DangerCard />
          </div>
        ) : (
          <StyleGuideCard />
        )}
      </div>
    </div>
  );
}

function ProfileCard() {
  const { user } = useUser();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const dirty =
    firstName.trim() !== (user.firstName ?? "") ||
    lastName.trim() !== (user.lastName ?? "");

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await user!.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await user!.setProfileImage({ file });
      await user!.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't update your photo.",
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const initial = (
    user.firstName?.[0] ||
    user.lastName?.[0] ||
    user.primaryEmailAddress?.emailAddress?.[0] ||
    "?"
  ).toUpperCase();

  return (
    <div className={CARD}>
      <span className={LABEL}>Profile</span>

      <div className="mt-4 flex items-center gap-4">
        <span className="relative block w-28 h-28 rounded-full overflow-hidden bg-[#111] flex-shrink-0">
          {user.hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center bg-ladder-green text-[#1a1a1a] text-3xl font-semibold uppercase">
              {initial}
            </span>
          )}
        </span>
        <label className="cursor-pointer text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors">
          {uploading
            ? "Uploading…"
            : user.hasImage
              ? "Change photo"
              : "Upload photo"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onPickImage}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] text-muted uppercase tracking-widest mb-1.5">
            First name
          </label>
          <input
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setSaved(false);
            }}
            className={INPUT}
          />
        </div>
        <div>
          <label className="block text-[10px] text-muted uppercase tracking-widest mb-1.5">
            Last name
          </label>
          <input
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              setSaved(false);
            }}
            className={INPUT}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-[10px] text-muted uppercase tracking-widest mb-1.5">
          Email
        </label>
        <p className="text-sm text-foreground font-sans">
          {user.primaryEmailAddress?.emailAddress ?? "—"}
        </p>
        <p className="text-xs text-muted font-sans mt-1">
          This is your sign-in email. We send your sign-in code here.
        </p>
      </div>

      {error && <p className="mt-4 text-xs text-ladder-red font-sans">{error}</p>}

      <div className="mt-5 flex items-center gap-4">
        <button onClick={save} disabled={!dirty || saving} className={BTN_PRIMARY}>
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && !dirty && (
          <span className="text-[10px] text-ladder-green uppercase tracking-widest">
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

function GoogleCard() {
  const { user } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Linking/unlinking an external account is a sensitive operation that Clerk
  // gates behind step-up reverification. useReverification prompts the user to
  // re-verify (an email code, since we're passwordless) and retries on success.
  const doConnect = useReverification(async () => {
    // Clear any stale unverified Google link left by a cancelled attempt so
    // re-connecting doesn't collide.
    const stale = user!.externalAccounts.find(
      (a) => isGoogleAccount(a) && a.verification?.status !== "verified",
    );
    if (stale) {
      await stale.destroy();
      await user!.reload();
    }
    return user!.createExternalAccount({
      strategy: "oauth_google",
      redirectUrl: `${window.location.origin}/settings`,
    });
  });

  const doDisconnect = useReverification(async () => {
    const g = user!.externalAccounts.find(
      (a) => isGoogleAccount(a) && a.verification?.status === "verified",
    );
    if (g) {
      await g.destroy();
      await user!.reload();
    }
  });

  if (!user) return null;

  // Only a *verified* Google link counts as connected. createExternalAccount
  // adds the record in an unverified state before the OAuth round-trip, so a
  // cancelled attempt would otherwise show as "Connected".
  const google = user.externalAccounts.find(
    (a) => isGoogleAccount(a) && a.verification?.status === "verified",
  );

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const ext = await doConnect();
      const url = ext?.verification?.externalVerificationRedirectURL;
      if (url) {
        window.location.href = url.toString();
      } else {
        setError("Couldn't start the Google connection.");
        setBusy(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't connect Google.");
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      await doDisconnect();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't disconnect Google.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={CARD}>
      <span className={LABEL}>Google</span>
      {google ? (
        <>
          <p className="mt-4 text-sm text-foreground font-sans">
            Connected
            {google.emailAddress ? (
              <span className="text-muted"> · {google.emailAddress}</span>
            ) : null}
          </p>
          <p className="text-xs text-muted font-sans mt-1">
            You can sign in with Google. Disconnecting still leaves email
            sign-in, so you won&apos;t be locked out.
          </p>
          {error && (
            <p className="mt-4 text-xs text-ladder-red font-sans">{error}</p>
          )}
          <div className="mt-5">
            <button onClick={disconnect} disabled={busy} className={BTN_GHOST}>
              {busy ? "Working…" : "Disconnect Google"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm text-foreground font-sans">Not connected</p>
          <p className="text-xs text-muted font-sans mt-1">
            Connect Google to sign in with one click instead of an email code.
          </p>
          {error && (
            <p className="mt-4 text-xs text-ladder-red font-sans">{error}</p>
          )}
          <div className="mt-5">
            <button onClick={connect} disabled={busy} className={BTN_PRIMARY}>
              {busy ? "Connecting…" : "Connect Google"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DangerCard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const PHRASE = "Delete my account";

  // Account deletion is reverification-gated by Clerk, same as account linking.
  const doDelete = useReverification(async () => {
    await user!.delete();
  });

  if (!user) return null;

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    try {
      await doDelete();
      await signOut({ redirectUrl: "/" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete account.");
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setConfirmText("");
    setError(null);
  }

  return (
    <>
      <div className={CARD}>
        <span className="text-[9px] text-ladder-red uppercase tracking-widest font-semibold">
          Delete account
        </span>
        <p className="mt-4 text-xs text-muted font-sans leading-relaxed">
          Permanently delete your account, your scores, and your team
          membership. This cannot be undone.
        </p>
        <div className="mt-5">
          <button
            onClick={() => setOpen(true)}
            className="text-xs font-semibold bg-ladder-red text-white uppercase tracking-widest px-5 py-2.5 hover:bg-ladder-red/90 transition-colors"
          >
            Delete account
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md border border-[#2a2a2a] bg-[#161616] p-5 shadow-2xl shadow-black/50 font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-sans font-semibold text-foreground mb-2">
              Delete your account
            </h2>
            <p className="text-xs text-muted font-sans mb-4 leading-relaxed">
              This permanently deletes your Ladder account, all of your scores,
              and removes you from any team. It cannot be undone. Type{" "}
              <span className="text-foreground">{PHRASE}</span> to confirm.
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={PHRASE}
              autoFocus
              className={INPUT}
            />
            {error && (
              <p className="mt-3 text-xs text-ladder-red font-sans">{error}</p>
            )}
            <div className="mt-5 flex items-center justify-end gap-4">
              <button
                onClick={close}
                disabled={busy}
                className="text-xs font-semibold text-muted hover:text-foreground transition-colors px-4 py-1.5 uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={busy || confirmText.trim() !== PHRASE}
                className="text-xs font-semibold bg-ladder-red text-white px-4 py-1.5 hover:bg-ladder-red/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-widest"
              >
                {busy ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type StyleGuideStatus = {
  present: boolean;
  fileName: string | null;
  uploadedAt: number | null;
  conflicts?: { topic: string; summary: string; interpretation: string }[];
  tier: string;
  canManage: boolean;
};

/**
 * Team style guide upload/manage (Settings → Style Guide tab). Drives entirely
 * off GET /api/org/style-guide, which reports tier + whether this user can
 * manage. Non-team users see an upsell; non-lead members see read-only status.
 */
function StyleGuideCard() {
  const [status, setStatus] = useState<StyleGuideStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  /** Live progress line shown while the PDF is being distilled (slow step). */
  const [progress, setProgress] = useState<string | null>(null);
  /** Success confirmation after an upload/replace. */
  const [notice, setNotice] = useState<string | null>(null);
  /** Branded remove-confirmation dialog. */
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/org/style-guide");
      if (!res.ok) throw new Error("Couldn't load style-guide status.");
      setStatus((await res.json()) as StyleGuideStatus);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same filename
    if (!file) return;
    setBusy(true);
    setErr(null);
    setNotice(null);
    setProgress("Reading your style guide. This can take a few seconds…");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/org/style-guide", {
        method: "POST",
        body: fd,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Upload failed.");
      await load();
      setNotice(
        "Style guide saved. Ladder will flag copy that doesn't match it on future scans.",
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      const res = await fetch("/api/org/style-guide", { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Remove failed.");
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Remove failed.");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  if (!status) {
    return (
      <div className={CARD}>
        <p className="text-sm text-muted font-sans">Loading…</p>
      </div>
    );
  }

  // Not on the Team plan → upsell.
  if (status.tier !== "team") {
    return (
      <div className={CARD}>
        <p className={LABEL}>Style Guide</p>
        <h2 className="text-base font-sans text-foreground mt-2 mb-2">
          A Team-plan feature
        </h2>
        <p className="text-sm text-muted font-sans leading-relaxed">
          Upload your team&apos;s writing style guide and Ladder flags copy that
          deviates from it on every scan — in the web app and the Figma plugin.
          It&apos;s part of the Ladder Team plan.
        </p>
      </div>
    );
  }

  return (
    <div className={CARD}>
      <p className={LABEL}>Team Style Guide</p>
      <div className="mt-3 grid gap-8 md:grid-cols-2">
        {/* Left — what it does / doesn't do */}
        <div>
          <p className="text-sm text-muted font-sans leading-relaxed">
            Upload a PDF of your team&apos;s writing style guide. Ladder reads it
            and flags on-screen copy that doesn&apos;t comply, with a suggested
            fix, on the web score and in the Figma plugin&apos;s Improve Copy.
          </p>
          <p className="text-[9px] text-muted uppercase tracking-widest font-semibold mt-4">
            Does
          </p>
          <p className="text-sm text-muted font-sans mt-1 leading-relaxed">
            Point out wording, terminology, tone, and formatting that breaks your
            guide.
          </p>
          <p className="text-[9px] text-muted uppercase tracking-widest font-semibold mt-3">
            Does Not
          </p>
          <p className="text-sm text-muted font-sans mt-1 leading-relaxed">
            Change your Ladder score. Style compliance is advisory only.
          </p>
        </div>

        {/* Right — upload + controls */}
        <div>
          {status.present ? (
            <div className="border border-[#333] bg-[#111] p-3 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <a
                  href="/api/org/style-guide/download"
                  target="_blank"
                  rel="noopener"
                  className="text-sm text-foreground font-sans underline"
                >
                  {status.fileName || "style-guide.pdf"}
                </a>
                <p className="text-[10px] text-muted font-sans mt-0.5">
                  {status.uploadedAt
                    ? `Uploaded ${new Date(status.uploadedAt).toLocaleDateString()}`
                    : ""}
                  {!status.canManage && " · Your team lead manages this."}
                </p>
              </div>
              {status.canManage && (
                <div className="flex items-center gap-2">
                  <label className={`${BTN_GHOST} cursor-pointer`}>
                    {busy ? "Working…" : "Replace"}
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      disabled={busy}
                      onChange={handleUpload}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    disabled={busy}
                    className={BTN_GHOST}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ) : status.canManage ? (
            <label className={`${BTN_PRIMARY} cursor-pointer inline-block`}>
              {busy ? "Uploading…" : "Upload PDF"}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={busy}
                onChange={handleUpload}
              />
            </label>
          ) : (
            <p className="text-sm text-muted font-sans">
              No style guide uploaded yet. Your team lead manages this.
            </p>
          )}

          {progress && (
            <p className="mt-3 text-xs text-ladder-green font-sans animate-pulse">
              {progress}
            </p>
          )}
          {notice && !progress && (
            <p className="mt-3 text-xs text-ladder-green font-sans">{notice}</p>
          )}
          {err && (
            <p className="mt-3 text-xs text-ladder-red font-sans">{err}</p>
          )}

          {status.present && status.conflicts && status.conflicts.length > 0 && (
            <div className="mt-6">
              {/* Heading above the boxes, gold, same style as the "Team Style Guide" label. */}
              <p className="text-[9px] text-[#d4af37] uppercase tracking-widest font-semibold">
                {status.conflicts.length} ambiguit
                {status.conflicts.length === 1 ? "y" : "ies"} in your guide
              </p>
              <p className="text-sm text-foreground font-sans mt-2 leading-relaxed">
                Your guide gives conflicting direction in places. Ladder applies the
                most specific rule (shown below). To change how these are handled,
                edit your style guide and upload a new version.
              </p>
              <div className="mt-4 space-y-3">
                {status.conflicts.map((c, i) => (
                  <div
                    key={i}
                    className="border border-[#b8860b]/50 bg-[#b8860b]/10 p-4"
                  >
                    <p className="text-sm text-foreground font-sans font-semibold">
                      {c.topic}
                    </p>
                    <p className="text-sm text-foreground font-sans mt-1.5 leading-relaxed">
                      {c.summary}
                    </p>
                    {c.interpretation && (
                      <p className="text-sm text-[#e3c46b] font-sans mt-2 leading-relaxed">
                        Ladder applies: {c.interpretation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Remove style guide?"
        body="Scans will stop checking copy against it."
        confirmLabel="Remove"
        destructive
        busy={busy}
        onConfirm={handleRemove}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
