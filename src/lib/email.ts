/**
 * System email — shared sender + templates (#402).
 *
 * All product-sent email (not Clerk auth email) goes through here so there's
 * one place to style. The chrome deliberately mirrors the Clerk email templates
 * (centered-left black Ladder logo, white card, #111827 headings/body, near-
 * black buttons, #B7B8C2 divider + "© year Ladder" footer) so to a recipient
 * it reads as coming from the same place as their sign-in emails. Templates are
 * interim — they'll be revisited when we upgrade to the paid Clerk tier.
 *
 * Sending uses Resend (RESEND_API_KEY). With no key it falls back to a console
 * log so the event is still visible in Vercel runtime logs (dev/preview).
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://runladder.com";
const LOGO_URL = `${APP_URL}/email/ladder-logo.png`;
const FROM = "Ladder <alerts@runladder.com>";
/** Internal ops inbox — matches the existing cap-alert recipient. */
export const OPS_EMAIL = "hello@drawbackwards.com";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Wrap body HTML in the Clerk-matching shell (logo header + card + footer).
 * `body` is trusted, pre-built HTML from a template function below.
 */
function shell(body: string): string {
  const year = new Date().getFullYear();
  return `<div style="margin:0;padding:40px 0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;">
      <tr><td align="left" style="padding:32px 32px 8px;">
        <img src="${LOGO_URL}" width="103" height="20" alt="Ladder" style="display:block;border:0;outline:none;text-decoration:none;height:20px;width:103px;">
      </td></tr>
      <tr><td align="left" style="padding:24px 32px 48px;">${body}</td></tr>
      <tr><td style="padding:24px 32px 48px;">
        <div style="height:1px;background:#B7B8C2;font-size:0;line-height:0;">&nbsp;</div>
        <p style="margin:16px 0 0;font-size:13px;color:#747686;">&copy; ${year} Ladder</p>
      </td></tr>
    </table>
  </td></tr></table>
</div>`;
}

/** Reusable pieces. */
const h1 = (text: string) =>
  `<h1 style="margin:0;font-size:24px;line-height:32px;font-weight:700;color:#111827;">${esc(text)}</h1>`;
const p = (html: string, mt = 24) =>
  `<p style="margin:${mt}px 0 0;font-size:14px;line-height:22px;color:#111827;">${html}</p>`;

/** App-style pool meter — black fill on a gray track, Outlook-safe table. */
function meter(used: number, total: number, daysToReset: number): string {
  const fill = Math.min(100, Math.round((used / total) * 100));
  const rest = 100 - fill;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;">
    <tr>
      <td align="left" style="font-size:13px;line-height:18px;color:#111827;">${used.toLocaleString()} of ${total.toLocaleString()} scores this month</td>
      <td align="right" style="font-size:13px;line-height:18px;color:#111827;">Resets in ${daysToReset} day${daysToReset === 1 ? "" : "s"}</td>
    </tr>
  </table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 0;background:#e6e6e6;"><tr>
    <td width="${fill}%" style="height:8px;line-height:8px;font-size:0;background:#111827;">&nbsp;</td>
    <td width="${rest}%" style="height:8px;line-height:8px;font-size:0;">&nbsp;</td>
  </tr></table>`;
}

export type PoolAlert = {
  audience: "lead" | "internal";
  /** Crossed threshold as an integer percent (80 or 100). */
  threshold: number;
  teamName: string;
  leadFirstName?: string | null;
  used: number;
  total: number;
  daysToReset: number;
  /** For the internal admin-dashboard link. */
  orgId?: string | null;
};

/** Build { subject, html } for a pool-usage alert, per audience + threshold. */
export function renderPoolAlert(a: PoolAlert): { subject: string; html: string } {
  const reached = a.threshold >= 100;
  const team = esc(a.teamName);

  if (a.audience === "lead") {
    const hi = a.leadFirstName ? `Hi ${esc(a.leadFirstName)}, ` : "";
    const usage = reached
      ? `${hi}${team} has used 100% of its monthly pool.`
      : `${hi}${team} has used about ${a.threshold}% of its monthly pool.`;
    const body =
      h1(reached ? "Your team has reached its monthly pool" : "Your team is approaching its monthly pool") +
      p(usage) +
      meter(a.used, a.total, a.daysToReset) +
      p("Don't worry, you can keep scoring past it during a short grace period. We just wanted to give you a heads-up.") +
      p("Need more capacity? Just reply to this email and we'll talk about it.");
    return {
      subject: reached
        ? "Your team has reached its monthly Ladder pool"
        : "Your team is approaching its monthly Ladder pool",
      html: shell(body),
    };
  }

  // Internal (ops) — names the client in the heading, links to admin.
  const adminLink = a.orgId ? `${APP_URL}/admin/clients/${a.orgId}` : `${APP_URL}/admin/clients`;
  const body =
    h1(reached ? `${a.teamName} has reached its monthly pool` : `${a.teamName} is approaching its monthly pool`) +
    p(reached ? `${team} has used 100% of its monthly pool.` : `${team} has used about ${a.threshold}% of its monthly pool.`) +
    meter(a.used, a.total, a.daysToReset) +
    p(`The team lead has been emailed. <a href="${adminLink}" style="color:#131316;text-decoration:underline;">Review usage in the admin dashboard</a>.`);
  return {
    subject: `[Ladder] ${a.teamName} ${reached ? "reached" : `at ${a.threshold}% of`} its monthly pool`,
    html: shell(body),
  };
}

/**
 * Sample renderings for the admin preview + test-send tooling (#402). Maps a
 * short type string to a rendered email with representative data. Returns null
 * for an unknown type. Keep the type strings in sync with the admin UI.
 */
export function emailSample(type: string): { subject: string; html: string } | null {
  const m = /^pool-(lead|internal)-(80|100)$/.exec(type);
  if (m) {
    const audience = m[1] as "lead" | "internal";
    const threshold = Number(m[2]);
    const total = 25000;
    return renderPoolAlert({
      audience,
      threshold,
      teamName: "Lumin Digital",
      leadFirstName: "Mike",
      used: Math.round((threshold / 100) * total),
      total,
      daysToReset: 12,
      orgId: "org_sample",
    });
  }
  return null;
}

/** Type strings the preview/test tooling understands. */
export const EMAIL_SAMPLE_TYPES = [
  "pool-lead-80",
  "pool-lead-100",
  "pool-internal-80",
  "pool-internal-100",
] as const;

/**
 * Send an HTML email via Resend. Falls back to a console log when
 * RESEND_API_KEY is unset (dev/preview) so the event is still observable.
 * Best-effort — never throws to the caller.
 */
export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("[LADDER:EMAIL]", JSON.stringify({ to: opts.to, subject: opts.subject }));
    return;
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
  } catch (err) {
    console.error("[LADDER:EMAIL] send failed:", err);
  }
}
