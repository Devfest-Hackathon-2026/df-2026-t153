"use client";

import type { InventoryObject } from "@/lib/api";

type Props = {
  items: InventoryObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

// Names underlined in ink, like entries in a list; the chosen one is in vermilion
export default function Lineup({ items, selectedId, onSelect }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-muted" data-testid="no-lineup">
        この写真では主役が見つかりませんでした。壁や道路のような大きな面より、手で触れる大きさの物が写っていると見つかりやすくなります。
      </p>
    );
  }

  return (
    <div className="flex items-baseline gap-4">
      <span
        className="shrink-0 text-[11px] tracking-[0.2em] text-ink-muted"
        aria-hidden
      >
        ほかに
      </span>
      <ul
        className="no-scrollbar flex gap-5 overflow-x-auto"
        role="listbox"
        aria-label="ほかの候補"
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
                className={`font-display border-b px-0.5 py-2 text-[15px] transition-colors ${
                  selected
                    ? "border-mark font-bold text-mark"
                    : "border-ink text-ink active:text-ink-muted"
                }`}
              >
                {o.name}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
