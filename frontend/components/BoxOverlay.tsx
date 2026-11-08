"use client";

import { useState } from "react";
import type { InventoryObject } from "@/lib/api";

type Props = {
  src: string;
  objects: InventoryObject[];
  lineup: string[];
  selectedId: string | null;
  /** Animate the boxes locking on one by one (first appearance only) */
  reveal?: boolean;
};

// Natural size for the viewBox, plus the rendered width so labels can stay a fixed CSS size
type Size = { w: number; h: number; shownW: number };

/** Shared by the pre-result preview so the photo does not jump when the boxes arrive */
export const PHOTO_CLASS =
  "block h-auto max-h-[58dvh] w-auto max-w-full rounded-2xl";

const FIRST_MS = 150;
const STAGGER_MS = 110;
const LOCK_MS = 450;

// Boxes appear in order; many objects are squeezed so the whole reveal stays under ~2s
function lockDelay(i: number, n: number): number {
  return FIRST_MS + i * Math.min(STAGGER_MS, 1200 / Math.max(n, 1));
}

/** How long the page should wait before showing the candidates under the photo */
export function revealDuration(n: number): number {
  return lockDelay(Math.max(n - 1, 0), n) + LOCK_MS + 600;
}

// Four corner brackets: the "lock-on" mark for candidates
function brackets(x1: number, y1: number, x2: number, y2: number): string {
  const l = Math.min(x2 - x1, y2 - y1) * 0.22;
  return [
    `M${x1} ${y1 + l} V${y1} H${x1 + l}`,
    `M${x2 - l} ${y1} H${x2} V${y1 + l}`,
    `M${x2} ${y2 - l} V${y2} H${x2 - l}`,
    `M${x1 + l} ${y2} H${x1} V${y2 - l}`,
  ].join(" ");
}

export default function BoxOverlay({
  src,
  objects,
  lineup,
  selectedId,
  reveal = false,
}: Props) {
  const [size, setSize] = useState<Size | null>(null);
  const inLineup = new Set(lineup);
  // Draw lineup boxes last so red frames are never hidden under grey ones
  const ordered = [...objects].sort(
    (a, b) => Number(inLineup.has(a.id)) - Number(inLineup.has(b.id)),
  );

  return (
    <div className="relative mx-auto w-fit">
      {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL preview; natural size is needed for the overlay */}
      <img
        src={src}
        alt="送った写真"
        className={PHOTO_CLASS}
        onLoad={(e) =>
          setSize({
            w: e.currentTarget.naturalWidth,
            h: e.currentTarget.naturalHeight,
            shownW: e.currentTarget.clientWidth || e.currentTarget.naturalWidth,
          })
        }
      />
      {size && (
        // viewBox in image pixels keeps the aspect ratio and undistorted labels
        <svg
          viewBox={`0 0 ${size.w} ${size.h}`}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          {ordered.map((o, i) => {
            const [x1, y1, x2, y2] = o.box.map(
              (v, i) => (v / 1000) * (i % 2 ? size.h : size.w),
            );
            const hot = inLineup.has(o.id);
            const selected = o.id === selectedId;
            // ~12 CSS px regardless of how far the photo is scaled down
            const fontSize = (size.w / size.shownW) * 12;
            const labelY =
              y1 - fontSize * 0.3 > fontSize
                ? y1 - fontSize * 0.3
                : y1 + fontSize;
            const delay = lockDelay(i, ordered.length);
            return (
              <g
                key={o.id}
                className={reveal ? "lock-on" : undefined}
                style={reveal ? { animationDelay: `${delay}ms` } : undefined}
              >
                <rect
                  x={x1}
                  y={y1}
                  width={x2 - x1}
                  height={y2 - y1}
                  fill="none"
                  stroke={hot ? "#d9412b" : "rgba(255,255,255,0.55)"}
                  strokeWidth={hot ? (selected ? 5 : 1.5) : 1.5}
                  vectorEffect="non-scaling-stroke"
                />
                {hot && (
                  <path
                    d={brackets(x1, y1, x2, y2)}
                    fill="none"
                    stroke="#d9412b"
                    strokeWidth={4}
                    strokeLinecap="square"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {hot && reveal && (
                  <rect
                    className="pulse-ring"
                    style={{ animationDelay: `${delay + LOCK_MS}ms` }}
                    x={x1}
                    y={y1}
                    width={x2 - x1}
                    height={y2 - y1}
                    fill="none"
                    stroke="#d9412b"
                    strokeWidth={2.5}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {/* Labels only for candidates; the rest stay as faint frames to keep the photo readable */}
                {hot && (
                  <text
                    x={x1 + fontSize * 0.2}
                    y={labelY}
                    fontSize={fontSize}
                    fill="#d9412b"
                    stroke="rgba(0,0,0,0.6)"
                    strokeWidth={fontSize * 0.12}
                    paintOrder="stroke"
                  >
                    {o.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
