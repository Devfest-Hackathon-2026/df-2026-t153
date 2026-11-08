import type { FriendlyError } from "@/lib/errors";

type Props = {
  error: FriendlyError;
  onRetry?: () => void;
  retryLabel?: string;
};

export default function ErrorNotice({
  error,
  onRetry,
  retryLabel = "もう一度",
}: Props) {
  return (
    <div
      className="enter space-y-2 rounded-2xl border border-mark/30 bg-mark-soft px-4 py-3"
      role="alert"
      data-testid="error"
    >
      <p className="font-bold text-mark">{error.title}</p>
      <p className="text-sm text-ink">{error.action}</p>
      {onRetry && error.retryable && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-moss px-5 py-1.5 text-sm font-bold text-white active:bg-moss-deep"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
