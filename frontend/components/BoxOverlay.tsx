"use client";

import { useState } from "react";
import type { InventoryObject } from "@/lib/api";

type Props = {
  src: string;
  objects: InventoryObject[];
  lineup: string[];
  selectedId: string | null;
};

type Size = { w: number; h: number };

export default function BoxOverlay({
  src,
  objects,
  lineup,
  selectedId,
}: Props) {
  const [size, setSize] = useState<Size | null>(null);
  const inLineup = new Set(lineup);
  // Draw lineup boxes last so red frames are never hidden under grey ones
  const ordered = [...objects].sort(
    (a, b) => Number(inLineup.has(a.id)) - Number(inLineup.has(b.id)),
  );

  return (
    <div className="relative w-full">
      {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL preview; natural size is needed for the overlay */}
      <img
        src={src}
        alt="送った写真"
        className="block h-auto w-full rounded-lg"
        onLoad={(e) =>
          setSize({
            w: e.currentTarget.naturalWidth,
            h: e.currentTarget.naturalHeight,
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
          {ordered.map((o) => {
            const [x1, y1, x2, y2] = o.box.map(
              (v, i) => (v / 1000) * (i % 2 ? size.h : size.w),
            );
            const hot = inLineup.has(o.id);
            const fontSize = size.w * 0.032;
            const labelY =
              y1 - fontSize * 0.3 > fontSize
                ? y1 - fontSize * 0.3
                : y1 + fontSize;
            return (
              <g key={o.id}>
                <rect
                  x={x1}
                  y={y1}
                  width={x2 - x1}
                  height={y2 - y1}
                  fill="none"
                  stroke={hot ? "#d9412b" : "rgba(255,255,255,0.55)"}
                  strokeWidth={hot ? (o.id === selectedId ? 6 : 2.5) : 1.5}
                  vectorEffect="non-scaling-stroke"
                />
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
