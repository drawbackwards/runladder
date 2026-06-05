export function AuthShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    // Clerk slides its form left/right between steps (email → code).
    // We need horizontal overflow clipped so a mid-transition form
    // doesn't visually slide off the left edge of the viewport (Ward
    // saw this when focusing the email field — the form half-appeared
    // mid-slide). We still want VERTICAL overflow scrollable so tall
    // forms (OTP grid, verification step, social buttons) don't clip
    // at the bottom on short viewports.
    <div className="auth-shell min-h-screen flex flex-col items-center px-6 pt-20 pb-16 relative overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(106, 200, 155, 0.06) 0%, transparent 55%)",
        }}
      />
      {/* px-2 keeps a focused input's border/rounded corners from being clipped
          by overflow-x-hidden (the form content is inset from the clip edge,
          while the slide transition stays contained). Fixes #209. */}
      <div className="relative w-full max-w-[28rem] flex flex-col items-center my-auto overflow-x-hidden px-2">
        <div className="w-full">{children}</div>
        <div className="text-muted text-sm text-center mt-8">{footer}</div>
      </div>
    </div>
  );
}
