"use client";

import { useState } from "react";
import {
  useUser,
  useClerk,
  useReverification,
  RedirectToSignIn,
} from "@clerk/nextjs";

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
  "text-xs font-semibold bg-ladder-green text-[#1a1a1a] uppercase tracking-widest px-5 py-2.5 hover:bg-ladder-green/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const BTN_GHOST =
  "text-xs font-semibold text-foreground uppercase tracking-widest border border-[#333] px-5 py-2.5 hover:border-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

export default function SettingsPage() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl text-foreground font-sans">Settings</h1>
          <p className="text-xs text-muted font-sans mt-1">
            Your account and sign-in.
          </p>
        </div>

        <div className="space-y-4">
          <ProfileCard />
          <GoogleCard />
          <DangerCard />
        </div>
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
