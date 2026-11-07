"use client";

import type { ChangeEvent } from "react";

type Props = {
  disabled?: boolean;
  compact?: boolean;
  onSelect: (file: File) => void;
};

export default function PhotoInput({ disabled, compact, onSelect }: Props) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the same photo again still fires change
    e.target.value = "";
    if (file) onSelect(file);
  };

  const input = (
    <input
      type="file"
      accept="image/*"
      capture="environment"
      className="sr-only"
      disabled={disabled}
      onChange={handleChange}
    />
  );

  if (compact) {
    return (
      <label
        className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-card px-3 py-1.5 text-sm font-bold whitespace-nowrap ${
          disabled
            ? "text-ink-muted"
            : "cursor-pointer text-moss-deep active:bg-moss-soft"
        }`}
      >
        <span aria-hidden>📷</span>
        別の写真
        {input}
      </label>
    );
  }

  return (
    <label
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center ${
        disabled
          ? "border-line bg-card text-ink-muted"
          : "cursor-pointer border-moss/40 bg-card text-moss-deep active:bg-moss-soft"
      }`}
    >
      <span className="text-3xl" aria-hidden>
        📷
      </span>
      <span className="font-bold">写真を撮る・選ぶ</span>
      <span className="text-xs text-ink-muted">
        散歩中の1枚。看板より、見慣れた物を
      </span>
      {input}
    </label>
  );
}
