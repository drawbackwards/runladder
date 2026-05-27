/**
 * Round avatar bubble used in team rosters and member detail headers.
 * Shows the user's photo only when they've uploaded a real one
 * (`hasImage`). Clerk auto-generates a gradient `imageUrl` for every user,
 * so we gate on `hasImage` — otherwise the gradient would always win and
 * the branded default below would never show. The default is a brand-green
 * circle with the user's first initial in the site background color.
 *
 * Server-friendly: no client hooks, no event handlers — safe to render
 * from server components.
 */

type AvatarProps = {
  imageUrl?: string | null;
  /** True only when the user uploaded a real photo (Clerk `hasImage`). */
  hasImage?: boolean;
  name?: string | null;
  email?: string | null;
  size?: number;
  ring?: "none" | "manager";
};

function initialFor(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "";
  return source ? source[0]!.toUpperCase() : "?";
}

export function Avatar({
  imageUrl,
  hasImage,
  name,
  email,
  size = 32,
  ring = "none",
}: AvatarProps) {
  const ringClass =
    ring === "manager"
      ? "ring-1 ring-ladder-green ring-offset-2 ring-offset-[#1a1a1a]"
      : "";
  const showImage = !!hasImage && !!imageUrl;

  return (
    <span
      className={`relative block rounded-full overflow-hidden bg-ladder-green flex-shrink-0 ${ringClass}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl!}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className="absolute inset-0 flex items-center justify-center bg-ladder-green text-background font-semibold uppercase font-sans"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {initialFor(name, email)}
        </span>
      )}
    </span>
  );
}
