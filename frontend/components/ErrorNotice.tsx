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
      className="enter space-y-2 border-l-2 border-mark pl-4"
      role="alert"
      data-testid="error"
    >
      <p className="font-bold text-mark">{error.title}</p>
      <p className="text-sm text-ink">{error.action}</p>
      {onRetry && error.retryable && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-ink/60 px-4 py-1 text-sm text-ink active:bg-ink/5"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
