"use client";

import type { InventoryObject } from "@/lib/api";

type Props = {
  items: InventoryObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function Lineup({ items, selectedId, onSelect }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        今回は主役の候補が見つかりませんでした。
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((o) => {
        const selected = o.id === selectedId;
        return (
          <li key={o.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(o.id)}
              className={`w-full rounded-lg border-2 px-3 py-2 text-left ${
                selected
                  ? "border-red-600 bg-red-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <span className="block font-bold">{o.name}</span>
              <span className="block text-sm text-gray-600">{o.detail}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
