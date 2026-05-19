type Props = {
  title: string;
  owner?: string;
  updatedAt?: string;
  updatedBy?: string;
  intent?: string;
};

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

export function LastUpdated({ title, owner, updatedAt, updatedBy, intent }: Props) {
  return (
    <header className="mb-10 pb-6 border-b border-border">
      <h1 className="text-3xl font-bold text-foreground mb-2 font-sans">{title}</h1>
      {intent && (
        <p className="text-sm text-body max-w-2xl font-sans leading-snug mb-4">
          {intent}
        </p>
      )}
      <div className="flex items-center gap-6 text-[10px] uppercase tracking-widest text-muted font-sans">
        {owner && (
          <span>
            Owner: <span className="text-body">{owner}</span>
          </span>
        )}
        {updatedAt && (
          <span>
            Updated: <span className="text-body">{fmtDate(updatedAt)}</span>
            {updatedBy ? ` by ${updatedBy}` : ""}
          </span>
        )}
      </div>
    </header>
  );
}
