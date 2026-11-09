import type { FriendlyError } from "@/lib/errors";

type Props = {
  error: FriendlyError;
  onRetry?: () => void;
  retryLabel?: string;
};

// A rule above and below, like a notice pinned to the page: no coloured bar
export default function ErrorNotice({
  error,
  onRetry,
  retryLabel = "もう一度",
}: Props) {
  return (
    <div
      className="enter space-y-2 border-t border-b border-mark py-3"
      role="alert"
      data-testid="error"
    >
      <p className="font-display font-bold text-mark">{error.title}</p>
      <p className="text-sm text-ink">{error.action}</p>
      {onRetry && error.retryable && (
        <button
          type="button"
          onClick={onRetry}
          className="font-display border border-indigo px-4 py-1.5 text-sm text-indigo active:bg-indigo/10"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
