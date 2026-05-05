"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser, RedirectToSignIn } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";

type AcceptResult =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "success"; teamName: string }
  | { state: "error"; message: string };

export default function AcceptInvitePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [result, setResult] = useState<AcceptResult>({ state: "idle" });

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !token) return;

    let cancelled = false;
    async function accept() {
      setResult({ state: "loading" });
      try {
        const res = await fetch("/api/team/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || `Accept failed (${res.status})`);
        }
        if (!cancelled) {
          setResult({
            state: "success",
            teamName: json.team?.name || "your team",
          });
          // Brief hold so the user can read the success message.
          setTimeout(() => router.push("/dashboard/team"), 1200);
        }
      } catch (e) {
        if (!cancelled) {
          setResult({
            state: "error",
            message: e instanceof Error ? e.message : "Accept failed",
          });
        }
      }
    }

    accept();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, token, router]);

  if (!isLoaded) return null;

  if (!isSignedIn) {
    const redirectUrl =
      typeof window !== "undefined" ? window.location.pathname : `/team/join/${token}`;
    return <RedirectToSignIn redirectUrl={redirectUrl} />;
  }

  return (
    <div className="pt-32 px-6">
      <div className="max-w-md mx-auto text-center">
        <p className="font-mono text-xs text-ladder-green uppercase tracking-widest mb-6">
          Team invite
        </p>

        {result.state === "loading" && (
          <p className="text-sm text-body font-sans">
            Accepting your invite{user?.firstName ? `, ${user.firstName}` : ""}…
          </p>
        )}

        {result.state === "success" && (
          <>
            <h1 className="text-2xl font-bold mb-3">
              You&rsquo;re in.
            </h1>
            <p className="text-sm text-body font-sans">
              Welcome to <span className="text-foreground">{result.teamName}</span>.
              Taking you to the team dashboard…
            </p>
          </>
        )}

        {result.state === "error" && (
          <>
            <h1 className="text-2xl font-bold mb-3">Couldn&rsquo;t accept</h1>
            <p className="text-sm text-ladder-red font-sans mb-6">
              {result.message}
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-xs uppercase tracking-widest text-muted hover:text-foreground transition-colors"
            >
              Go to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
