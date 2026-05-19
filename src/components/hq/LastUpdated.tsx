type Props = {
  title: string;
  updatedAt?: string;
  updatedBy?: string;
  lastPr?: number;
  intent?: string;
};

const REPO = "drawbackwards/runladder";

function fmtDate(iso: string | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function LastUpdated({ title, updatedAt, updatedBy, lastPr, intent }: Props) {
  return (
    <header className="mb-10 pb-6 border-b border-border">
      <h1 className="text-3xl font-bold text-foreground mb-2 font-sans">{title}</h1>
      {intent && (
        <p className="text-sm text-body max-w-2xl font-sans leading-snug mb-4">
          {intent}
        </p>
      )}
      {(updatedAt || lastPr) && (
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted font-sans">
          {updatedAt && (
            <span>
              Updated <span className="text-body">{fmtDate(updatedAt)}</span>
              {updatedBy ? ` by ${updatedBy}` : ""}
            </span>
          )}
          {lastPr && (
            <>
              <span aria-hidden>·</span>
              <a
                href={`https://github.com/${REPO}/pull/${lastPr}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ladder-green hover:opacity-80"
              >
                #{lastPr}
              </a>
            </>
          )}
        </div>
      )}
    </header>
  );
}
