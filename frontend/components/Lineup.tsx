"use client";

import type { InventoryObject } from "@/lib/api";

type Props = {
  items: InventoryObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

// One row of chips; the selected one is the only red thing besides the box on the photo
export default function Lineup({ items, selectedId, onSelect }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-muted" data-testid="no-lineup">
        この写真では主役が見つかりませんでした。壁や道路のような大きな面より、手で触れる大きさの物が写っていると見つかりやすくなります。
      </p>
    );
  }

  return (
    <ul
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1"
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
              className={`rounded-full border px-4 py-1.5 text-sm transition-[colors,transform] active:scale-95 ${
                selected
                  ? "border-mark bg-mark font-bold text-white"
                  : "border-ink/60 text-ink active:bg-ink/5"
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
