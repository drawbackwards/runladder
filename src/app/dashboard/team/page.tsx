"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  useAuth,
  useOrganization,
  useOrganizationList,
  CreateOrganization,
  RedirectToSignIn,
} from "@clerk/nextjs";
import Link from "next/link";
import { getScoreColor } from "@/lib/ladder";
import {
  letterGradeColor,
  LETTER_GRADE_THRESHOLD,
  type LetterGrade,
} from "@/lib/letter-grade";

type MemberStats = {
  totalScans: number;
  avgScore: number | null;
  bestScore: number | null;
  lastScoreAt: number | null;
};

type TeamMember = {
  membershipId: string;
  userId: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  joinedAt: number;
  stats: MemberStats | null;
  recentScans: number;
  letterGrade: LetterGrade | null;
};

type RungAverage = {
  rung: string;
  avg: number | null;
  count: number;
};

type Insights = {
  windowDays: number;
  threshold: number;
  totalScores: number;
  teamAvg: number | null;
  rungAverages: RungAverage[];
  weakestRung: { rung: string; avg: number; count: number } | null;
  strongestRung: { rung: string; avg: number; count: number } | null;
};

type TeamData = {
  isManager: boolean;
  members: TeamMember[];
  insights: Insights | null;
};

function fmtDate(input: number | string | Date | null | undefined): string {
  if (!input) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtRelative(ts: number | null | undefined): string {
  if (!ts) return "no activity";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function InviteForm({
  onInvite,
}: {
  onInvite: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onInvite(email.trim());
      setEmail("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-[#333] bg-[#1e1e1e] p-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          className="flex-1 min-w-[240px] bg-[#111] border border-[#333] text-sm text-foreground px-3 py-2 focus:outline-none focus:border-muted placeholder:text-[#555] font-sans"
        />
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="text-xs font-semibold bg-ladder-green text-background px-4 py-2 rounded-sm hover:bg-ladder-green/90 transition-colors disabled:opacity-40"
        >
          {busy ? "Sending…" : "Invite"}
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-ladder-red font-sans">{err}</p>}
      <p className="mt-2 text-[10px] text-muted font-sans">
        They&apos;ll get an email from Clerk with a sign-in link. On accept, they&apos;re comped to team tier automatically.
      </p>
    </form>
  );
}

function NoOrgPanel() {
  return (
    <div className="border border-[#333] bg-[#1e1e1e] p-8">
      <h2 className="text-base font-sans text-foreground mb-2">
        Start your team
      </h2>
      <p className="text-sm text-muted font-sans mb-6">
        Create a team to invite your designers and see how they&apos;re scoring.
      </p>
      <CreateOrganization
        afterCreateOrganizationUrl="/dashboard/team"
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-transparent shadow-none border-0 p-0",
          },
        }}
      />
    </div>
  );
}

function LetterGradeBadge({ grade }: { grade: LetterGrade | null }) {
  if (!grade) {
    return (
      <div
        className="flex-shrink-0 w-14 h-14 border border-[#333] bg-[#111] flex items-center justify-center"
        title="No scores in window"
      >
        <span className="text-2xl font-bold tabular-nums text-[#444]">—</span>
      </div>
    );
  }
  const color = letterGradeColor(grade);
  return (
    <div
      className="flex-shrink-0 w-14 h-14 border flex items-center justify-center"
      style={{
        borderColor: `${color}40`,
        backgroundColor: `${color}0d`,
      }}
      title={`Grade ${grade}`}
    >
      <span
        className="text-2xl font-bold tabular-nums"
        style={{ color }}
      >
        {grade}
      </span>
    </div>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="border border-[#333] bg-[#1e1e1e] p-4">
      <p className="text-[9px] text-muted uppercase tracking-widest mb-2">
        {label}
      </p>
      <p
        className="text-2xl font-bold tabular-nums"
        style={{ color: color ?? "var(--foreground)" }}
      >
        {value}
      </p>
    </div>
  );
}

function InsightsPanel({ insights }: { insights: Insights }) {
  const { totalScores, teamAvg, weakestRung, strongestRung, windowDays } =
    insights;

  if (totalScores === 0) {
    return (
      <div className="border border-[#333] bg-[#1e1e1e] p-6 mb-6">
        <p className="text-sm text-muted font-sans">
          No scores from your team in the last {windowDays} days. Once members
          start scoring, performance insights show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[10px] text-muted uppercase tracking-widest">
          Team performance
        </h2>
        <span className="text-[10px] text-muted">
          Last {windowDays} days
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatPill
          label="Team scans"
          value={String(totalScores)}
        />
        <StatPill
          label="Team avg"
          value={teamAvg !== null ? teamAvg.toFixed(1) : "—"}
          color={teamAvg !== null ? getScoreColor(teamAvg) : undefined}
        />
        <StatPill
          label="Strongest rung"
          value={
            strongestRung
              ? `${capitalize(strongestRung.rung)} ${strongestRung.avg.toFixed(1)}`
              : "—"
          }
          color={
            strongestRung ? getScoreColor(strongestRung.avg) : undefined
          }
        />
        <StatPill
          label="Weakest rung"
          value={
            weakestRung
              ? `${capitalize(weakestRung.rung)} ${weakestRung.avg.toFixed(1)}`
              : "—"
          }
          color={weakestRung ? getScoreColor(weakestRung.avg) : undefined}
        />
      </div>
      {weakestRung && (
        <p className="mt-3 text-xs text-muted font-sans">
          Your team&apos;s weakest rung is{" "}
          <span className="text-foreground">
            {capitalize(weakestRung.rung)}
          </span>
          . Designers typically miss this — coach toward it first.
        </p>
      )}
    </div>
  );
}

function MemberRow({
  member,
  isAdmin,
  isSelf,
  onRemove,
}: {
  member: TeamMember;
  isAdmin: boolean;
  isSelf: boolean;
  onRemove: () => void;
}) {
  const name =
    [member.firstName, member.lastName].filter(Boolean).join(" ") ||
    member.email ||
    "—";
  const stats = member.stats;
  const avg = stats?.avgScore ?? null;
  const lastAt = stats?.lastScoreAt ?? null;

  return (
    <li className="border-b border-[#222] last:border-0 p-4 flex items-center gap-4 flex-wrap">
      <LetterGradeBadge grade={member.letterGrade} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground font-sans">
          {name}
          {isSelf && (
            <span className="text-[10px] text-muted ml-2">(you)</span>
          )}
        </p>
        <p className="text-xs text-muted font-sans truncate">
          {member.email ?? "—"}
        </p>
        <p className="text-[10px] text-muted font-sans mt-1">
          Joined {fmtDate(member.joinedAt)} · {member.role.replace("org:", "")}
        </p>
      </div>
      <div className="flex items-center gap-5 flex-shrink-0">
        <div className="text-right min-w-[60px]">
          <p
            className="text-lg font-bold tabular-nums"
            style={{
              color: avg !== null ? getScoreColor(avg) : "#444",
            }}
          >
            {avg !== null ? avg.toFixed(1) : "—"}
          </p>
          <p className="text-[9px] text-muted uppercase tracking-widest">
            Avg
          </p>
        </div>
        <div className="text-right min-w-[60px]">
          <p className="text-lg font-bold tabular-nums text-foreground">
            {stats?.totalScans ?? 0}
          </p>
          <p className="text-[9px] text-muted uppercase tracking-widest">
            Scans
          </p>
        </div>
        <div className="text-right min-w-[80px] hidden sm:block">
          <p className="text-xs font-mono text-muted">{fmtRelative(lastAt)}</p>
          <p className="text-[9px] text-muted uppercase tracking-widest">
            Last
          </p>
        </div>
        {isAdmin && !isSelf && (
          <button
            onClick={onRemove}
            className="text-[10px] uppercase tracking-widest text-muted hover:text-ladder-red transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </li>
  );
}

export default function TeamPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { isLoaded: orgListLoaded, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const {
    organization,
    membership,
    memberships,
    invitations,
  } = useOrganization({
    memberships: { infinite: true },
    invitations: { infinite: true, status: ["pending"] },
  });

  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [teamErr, setTeamErr] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);

  const refreshTeamData = useCallback(async () => {
    setTeamLoading(true);
    setTeamErr(null);
    try {
      const res = await fetch("/api/dashboard/team");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Team fetch failed (${res.status})`);
      }
      const json = (await res.json()) as TeamData;
      setTeamData(json);
    } catch (e) {
      setTeamErr(e instanceof Error ? e.message : "Failed to load team");
    } finally {
      setTeamLoading(false);
    }
  }, []);

  useEffect(() => {
    if (organization?.id) {
      refreshTeamData();
    }
  }, [organization?.id, refreshTeamData]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  const hasAnyOrg =
    !!organization || (orgListLoaded && (userMemberships?.count ?? 0) > 0);

  if (!hasAnyOrg) {
    return (
      <div className="pt-20 font-mono">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h1 className="text-xl text-foreground font-sans">Team</h1>
            <p className="text-xs text-muted font-sans mt-1">
              Invite your designers, see how they&apos;re scoring.
            </p>
          </div>
          <NoOrgPanel />
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="pt-20 font-mono">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <p className="text-sm text-muted font-sans">Loading your team…</p>
        </div>
      </div>
    );
  }

  const isAdmin = membership?.role === "org:admin";
  const inviteList = invitations?.data ?? [];
  const memberList = teamData?.members ?? [];
  const selfUserId = membership?.publicUserData?.userId;

  async function handleInvite(email: string) {
    if (!organization) throw new Error("No active team");
    await organization.inviteMember({
      emailAddress: email,
      role: "org:member",
    });
    await invitations?.revalidate?.();
  }

  async function handleRevoke(invitationId: string) {
    if (!organization) return;
    const inv = inviteList.find((i) => i.id === invitationId);
    if (!inv) return;
    try {
      await inv.revoke();
      await invitations?.revalidate?.();
    } catch {
      // noop
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!organization) return;
    if (!confirm("Remove this member from the team?")) return;
    try {
      await organization.removeMember(userId);
      await Promise.all([
        memberships?.revalidate?.(),
        refreshTeamData(),
      ]);
    } catch {
      // noop
    }
  }

  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl text-foreground font-sans">
              {organization.name}
            </h1>
            <p className="text-xs text-muted font-sans mt-1">
              {memberList.length} member{memberList.length !== 1 ? "s" : ""}
              {inviteList.length > 0 &&
                ` · ${inviteList.length} pending invite${inviteList.length !== 1 ? "s" : ""}`}
              {isAdmin && (
                <>
                  {" · "}
                  <span className="text-ladder-green">manager</span>
                </>
              )}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="text-[10px] uppercase tracking-widest text-muted hover:text-foreground transition-colors"
          >
            ← Personal dashboard
          </Link>
        </div>

        {teamErr && (
          <div className="mb-6 border border-ladder-red/40 bg-ladder-red/5 text-ladder-red text-xs font-sans p-3">
            {teamErr}
          </div>
        )}

        {isAdmin && teamData?.insights && (
          <InsightsPanel insights={teamData.insights} />
        )}

        {isAdmin && (
          <section className="mb-10">
            <h2 className="text-[10px] text-muted uppercase tracking-widest mb-3">
              Invite a designer
            </h2>
            <InviteForm onInvite={handleInvite} />
          </section>
        )}

        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[10px] text-muted uppercase tracking-widest">
              Members
            </h2>
            {teamData && (
              <span className="text-[10px] text-muted">
                Grades from last 30 days, threshold {LETTER_GRADE_THRESHOLD.toFixed(1)}
              </span>
            )}
          </div>
          <div className="border border-[#333] bg-[#1e1e1e]">
            {teamLoading && memberList.length === 0 ? (
              <div className="p-8 text-center text-muted font-sans text-sm">
                Loading members…
              </div>
            ) : memberList.length === 0 ? (
              <div className="p-8 text-center text-muted font-sans text-sm">
                No members yet.
              </div>
            ) : (
              <ul>
                {memberList.map((m) => (
                  <MemberRow
                    key={m.membershipId}
                    member={m}
                    isAdmin={isAdmin}
                    isSelf={!!m.userId && m.userId === selfUserId}
                    onRemove={() => m.userId && handleRemoveMember(m.userId)}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        {inviteList.length > 0 && (
          <section>
            <h2 className="text-[10px] text-muted uppercase tracking-widest mb-3">
              Pending invitations
            </h2>
            <div className="border border-[#333] bg-[#1e1e1e]">
              <ul>
                {inviteList.map((inv) => (
                  <li
                    key={inv.id}
                    className="border-b border-[#222] last:border-0 p-4 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-sans truncate">
                        {inv.emailAddress}
                      </p>
                      <p className="text-[10px] text-muted font-sans mt-1">
                        Invited {fmtDate(inv.createdAt)}
                      </p>
                    </div>
                    <span className="text-[10px] text-ladder-green uppercase tracking-widest">
                      Pending
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        className="text-[10px] uppercase tracking-widest text-muted hover:text-ladder-red transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
