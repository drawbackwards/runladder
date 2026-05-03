import Link from "next/link";
import { LadderLogo } from "./LadderLogo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-16 relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(106, 200, 155, 0.06) 0%, transparent 55%)",
        }}
      />
      <div className="relative w-full max-w-[26rem] flex flex-col items-center">
        <Link href="/" aria-label="Ladder home" className="mb-10">
          <LadderLogo height={26} className="text-white" />
        </Link>
        <h1 className="text-3xl font-semibold text-foreground tracking-tight text-center mb-3">
          {title}
        </h1>
        <p className="text-body text-base text-center mb-10 max-w-[22rem]">
          {subtitle}
        </p>
        <div className="w-full">{children}</div>
        <div className="text-muted text-sm text-center mt-8">{footer}</div>
      </div>
    </div>
  );
}
