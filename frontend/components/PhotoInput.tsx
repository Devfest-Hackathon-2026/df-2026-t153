"use client";

import type { ChangeEvent } from "react";

type Props = {
  disabled?: boolean;
  compact?: boolean;
  onSelect: (file: File) => void;
};

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.2-2h5.6L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export default function PhotoInput({ disabled, compact, onSelect }: Props) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the same photo again still fires change
    e.target.value = "";
    if (file) onSelect(file);
  };

  const input = (
    // No `capture`: with it, iOS Safari opens the camera only and hides the photo library
    <input
      type="file"
      accept="image/*"
      className="sr-only"
      disabled={disabled}
      onChange={handleChange}
    />
  );

  if (compact) {
    return (
      <label
        className={`inline-flex shrink-0 items-center gap-1.5 text-sm whitespace-nowrap underline-offset-4 ${
          disabled
            ? "text-ink-muted"
            : "cursor-pointer text-ink active:underline"
        }`}
      >
        <CameraIcon className="h-5 w-5" />
        別の写真
        {input}
      </label>
    );
  }

  return (
    <label
      className={`flex flex-col items-center justify-center gap-3 border px-4 py-12 text-center ${
        disabled
          ? "border-line text-ink-muted"
          : "cursor-pointer border-ink text-ink active:bg-ink/5"
      }`}
    >
      <CameraIcon className="h-8 w-8" />
      <span className="font-display text-lg tracking-[0.1em]">
        写真を撮る・選ぶ
      </span>
      <span className="text-xs text-ink-muted">
        散歩中の1枚。看板より、見慣れた物を
      </span>
      {input}
    </label>
  );
}
