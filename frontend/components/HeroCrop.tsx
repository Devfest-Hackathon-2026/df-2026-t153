"use client";

import { useState } from "react";

type Props = {
  src: string;
  box: number[];
  name: string;
};

type Size = { w: number; h: number };

// Padding around the box so the crop shows a little context, in 0-1000 units
const PAD = 40;

export default function HeroCrop({ src, box, name }: Props) {
  const [size, setSize] = useState<Size | null>(null);
  const [x1, y1, x2, y2] = box;
  const cx1 = Math.max(0, x1 - PAD);
  const cy1 = Math.max(0, y1 - PAD);
  const cx2 = Math.min(1000, x2 + PAD);
  const cy2 = Math.min(1000, y2 + PAD);

  // The crop is a viewBox over the full image, so no canvas work is needed
  const view = size
    ? {
        x: (cx1 / 1000) * size.w,
        y: (cy1 / 1000) * size.h,
        w: ((cx2 - cx1) / 1000) * size.w,
        h: ((cy2 - cy1) / 1000) * size.h,
      }
    : null;

  return (
    <figure className="relative overflow-hidden rounded-2xl bg-ink shadow-card">
      {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL; only used to learn the natural size */}
      <img
        src={src}
        alt=""
        className="hidden"
        onLoad={(e) =>
          setSize({
            w: e.currentTarget.naturalWidth,
            h: e.currentTarget.naturalHeight,
          })
        }
      />
      {view && size && (
        <svg
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          className="block max-h-80 w-full"
          role="img"
          aria-label={`${name} の拡大`}
        >
          <image href={src} width={size.w} height={size.h} />
          <rect
            x={(x1 / 1000) * size.w}
            y={(y1 / 1000) * size.h}
            width={((x2 - x1) / 1000) * size.w}
            height={((y2 - y1) / 1000) * size.h}
            fill="none"
            stroke="#d9412b"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-10 pb-3 text-white">
        <span className="block text-xs tracking-wide opacity-80">
          今日の主役
        </span>
        <span className="block text-lg font-bold">{name}</span>
      </figcaption>
    </figure>
  );
}
