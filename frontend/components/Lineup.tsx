"use client";

import type { InventoryObject } from "@/lib/api";

type Props = {
  items: InventoryObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** chips: one horizontal row (story view); cards: name + detail (pick view) */
  variant?: "cards" | "chips";
};

export default function Lineup({
  items,
  selectedId,
  onSelect,
  variant = "cards",
}: Props) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        今回は主役の候補が見つかりませんでした。別の写真を試してみてください。
      </p>
    );
  }

  if (variant === "chips") {
    return (
      <ul
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1"
        role="listbox"
      >
        {items.map((o) => {
          const selected = o.id === selectedId;
          return (
            <li key={o.id} className="shrink-0">
              <button
                type="button"
                data-testid="lineup-chip"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(o.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold shadow-card transition-colors ${
                  selected
                    ? "bg-mark text-white"
                    : "border border-line bg-card text-ink active:bg-mark-soft"
                }`}
              >
                {o.name}
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((o, i) => {
        const selected = o.id === selectedId;
        return (
          <li key={o.id}>
            <button
              type="button"
              data-testid="lineup-chip"
              aria-pressed={selected}
              onClick={() => onSelect(o.id)}
              className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left shadow-card transition-colors ${
                selected
                  ? "border-mark bg-mark-soft"
                  : "border-line bg-card active:bg-moss-soft"
              }`}
            >
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-mark text-xs font-bold text-white"
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-bold">{o.name}</span>
                <span className="block text-sm text-ink-muted">{o.detail}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
