"use client";

import { useState } from "react";

type Props = {
  src: string;
  box: number[];
  name: string;
  /** Place name from the photo's location, when the server could resolve one */
  place?: string | null;
};

type Size = { w: number; h: number };

// Padding around the box so the crop shows a little context, in 0-1000 units
const PAD = 40;

export default function HeroCrop({ src, box, name, place }: Props) {
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

  // Edge to edge like a camera viewfinder: the parent has px-4, so pull out by -mx-4
  return (
    <figure className="relative -mx-4 overflow-hidden bg-ink">
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
          className="block max-h-[52dvh] w-full"
          role="img"
          aria-label={`${name} の拡大`}
        >
          {/* Photo and box zoom together, about the center of the crop (not of the whole photo) */}
          <g
            className="kenburns"
            style={{
              transformOrigin: `${view.x + view.w / 2}px ${view.y + view.h / 2}px`,
            }}
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
          </g>
        </svg>
      )}
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-4 pt-8 pb-2 text-white">
        <span className="block text-[11px] tracking-wide opacity-80">
          今日の主役
          {place && <span className="ml-2">📍 {place}</span>}
        </span>
        <span className="block text-base font-bold">{name}</span>
      </figcaption>
    </figure>
  );
}
