"use client";

import type { ChangeEvent } from "react";

type Props = {
  disabled?: boolean;
  onSelect: (file: File) => void;
};

export default function PhotoInput({ disabled, onSelect }: Props) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the same photo again still fires change
    e.target.value = "";
    if (file) onSelect(file);
  };

  return (
    <label
      className={`block w-full rounded-lg px-4 py-3 text-center font-bold text-white ${
        disabled
          ? "bg-gray-400"
          : "cursor-pointer bg-emerald-700 active:bg-emerald-800"
      }`}
    >
      写真を撮る・選ぶ
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={handleChange}
      />
    </label>
  );
}
