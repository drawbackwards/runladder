import Link from "next/link";
import { LadderLogo } from "./LadderLogo";

export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    // Drops `justify-center` + `overflow-hidden` so tall Clerk forms
    // (OTP grid, verification step, social buttons) scroll naturally
    // instead of clipping at the bottom of the viewport. Widens the
    // container slightly so focus rings and password reveal buttons
    // have breathing room.
    <div className="min-h-screen flex flex-col items-center px-6 pt-20 pb-16 relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(106, 200, 155, 0.06) 0%, transparent 55%)",
        }}
      />
      <div className="relative w-full max-w-[28rem] flex flex-col items-center my-auto">
        <Link href="/" aria-label="Ladder home" className="mb-10 mt-4">
          <LadderLogo height={26} className="text-white" />
        </Link>
        <div className="w-full">{children}</div>
        <div className="text-muted text-sm text-center mt-8">{footer}</div>
      </div>
    </div>
  );
}
