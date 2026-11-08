"use client";

import { useState, useSyncExternalStore } from "react";
import {
  getTakeawaysServerSnapshot,
  getTakeawaysSnapshot,
  subscribeTakeaways,
} from "@/lib/takeaways";

function formatDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function TakeawayHistory() {
  // The page is prerendered without localStorage; the store swaps in the real list after hydration
  const items = useSyncExternalStore(
    subscribeTakeaways,
    getTakeawaysSnapshot,
    getTakeawaysServerSnapshot,
  );
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;
  return (
    <section
      className="rounded-2xl border border-line bg-card shadow-card"
      data-section="history"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold"
      >
        これまでの散歩の目
        <span className="text-xs text-ink-muted">
          {items.length} 件 {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <ul className="space-y-3 px-4 pb-4">
          {items.map((t) => (
            <li
              key={t.at + t.text}
              className="border-l-4 border-moss bg-moss-soft px-3 py-2 text-sm"
            >
              <p className="leading-relaxed">{t.text}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {t.object_name}
                {formatDay(t.at) && ` · ${formatDay(t.at)}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
