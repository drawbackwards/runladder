/**
 * Round avatar bubble used in team rosters and member detail headers.
 * Renders the user's Clerk image when available; falls back to an
 * initials chip in subtle Ladder green so empty avatars still feel
 * like part of the brand.
 *
 * Server-friendly: no client hooks, no event handlers — safe to render
 * from server components.
 */

type AvatarProps = {
  imageUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
  ring?: "none" | "manager";
};

function initialFor(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "?";
  return source[0]!.toUpperCase();
}

export function Avatar({
  imageUrl,
  name,
  email,
  size = 32,
  ring = "none",
}: AvatarProps) {
  const ringClass =
    ring === "manager"
      ? "ring-1 ring-ladder-green ring-offset-2 ring-offset-[#1a1a1a]"
      : "";

  return (
    <span
      className={`relative block rounded-full overflow-hidden bg-[#1f1f1f] flex-shrink-0 ${ringClass}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className="absolute inset-0 flex items-center justify-center bg-ladder-green/15 text-ladder-green font-semibold uppercase font-sans"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {initialFor(name, email)}
        </span>
      )}
    </span>
  );
}
