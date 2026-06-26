"use client";

/**
 * Branded confirm dialog — replaces window.confirm() so destructive actions
 * use the app's dark/tool aesthetic instead of the browser's chrome. Renders
 * nothing when closed. Matches the modal pattern used by the account-deletion
 * flow in /settings.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="border border-[#333] bg-[#1e1e1e] p-6 max-w-md w-full">
        <h2 className="text-base text-foreground font-sans mb-2">{title}</h2>
        {body && (
          <p className="text-sm text-muted font-sans leading-relaxed mb-5">
            {body}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-xs font-semibold text-foreground uppercase tracking-widest border border-[#333] px-5 py-2.5 hover:border-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`text-xs font-semibold uppercase tracking-widest px-5 py-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              destructive
                ? "bg-ladder-red text-white hover:bg-ladder-red/90"
                : "bg-ladder-green text-[#1a1a1a] hover:bg-ladder-green-light"
            }`}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
