import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-ink-900/10 bg-white py-16 text-ink-700/60 shadow-card">
      <Loader2 size={22} className="animate-spin text-gold-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink-900/15 bg-white py-16 text-center shadow-card">
      <Inbox size={22} className="mb-1 text-ink-700/40" />
      <p className="text-sm font-medium text-ink-900">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-700/60">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-hot/20 bg-hot/5 py-16 text-center shadow-card">
      <AlertTriangle size={22} className="text-hot" />
      <p className="text-sm font-medium text-ink-900">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="focus-ring rounded-lg border border-ink-900/15 bg-white px-4 py-1.5 text-sm font-medium text-ink-800 shadow-card hover:border-gold-400/60"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function NotConnectedState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink-900/15 bg-white py-12 text-center shadow-card">
      <span className="h-2.5 w-2.5 rounded-full bg-ink-700/30" />
      <p className="text-sm font-medium text-ink-900">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-700/60">{description}</p>}
    </div>
  );
}
