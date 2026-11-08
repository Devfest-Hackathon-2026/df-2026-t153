"use client";

import { useState, useSyncExternalStore } from "react";
import {
  getTakeawaysServerSnapshot,
  getTakeawaysSnapshot,
  subscribeTakeaways,
} from "@/lib/takeaways";
import { VOICE_CLASS } from "./Narration";

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
    <section className="border-t border-line pt-2" data-section="history">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-2 text-left text-sm"
      >
        これまでの散歩の目
        <span className="text-xs text-ink-muted">
          {items.length} 件 {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <ul className="space-y-4 pt-2 pb-2">
          {items.map((t) => (
            <li key={t.at + t.text} className="border-l-2 border-moss pl-4">
              <p className={`${VOICE_CLASS} text-[16px]`}>{t.text}</p>
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
