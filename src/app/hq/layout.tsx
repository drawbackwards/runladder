import { redirect } from "next/navigation";
import { getTeamEmailWithStatus } from "@/lib/admin";
import { HqSidebar } from "@/components/hq/HqSidebar";

export const metadata = {
  title: "Ladder HQ",
  description: "Internal team hub for Ladder.",
};

export default async function HqLayout({ children }: { children: React.ReactNode }) {
  const result = await getTeamEmailWithStatus();

  if (result.status === "anonymous") {
    redirect("/login?redirect_url=/hq");
  }

  if (result.status === "unauthorized") {
    return (
      <div className="pt-20 max-w-2xl mx-auto px-6 py-20">
        <h1 className="text-xl font-bold font-sans mb-3">HQ access required</h1>
        <p className="text-sm text-muted font-sans">
          You&apos;re signed in as <code className="text-foreground">{result.email}</code>{" "}
          but you&apos;re not on the team allowlist. If this is a mistake, ask
          Ward to add you to <code className="text-foreground">TEAM_EMAILS</code> on
          Vercel.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-20">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-[220px_1fr] gap-12">
        <HqSidebar isAdmin={result.isAdmin} email={result.email} />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
