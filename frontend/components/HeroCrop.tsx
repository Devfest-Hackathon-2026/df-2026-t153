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
  // Not clamped to the photo: a big subject (a shrine hall) reaches the photo's edge, and
  // the margin must still exist or its frame ends up under the torn edges. The margin
  // outside the photo shows the paper colour of the figure.
  const cx1 = x1 - PAD;
  const cy1 = y1 - PAD;
  const cx2 = x2 + PAD;
  const cy2 = y2 + PAD;

  // The crop is a viewBox over the full image, so no canvas work is needed
  const view = size
    ? {
        x: (cx1 / 1000) * size.w,
        y: (cy1 / 1000) * size.h,
        w: ((cx2 - cx1) / 1000) * size.w,
        h: ((cy2 - cy1) / 1000) * size.h,
      }
    : null;

  // Edge to edge: the parent has px-4, so pull out by -mx-4. The name is not
  // repeated here; it stands in vertical type above the photo (D-38)
  return (
    <figure className="relative -mx-4 overflow-hidden bg-cream">
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
              stroke="#e9d6b4"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>
      )}
      <span className="torn-top" aria-hidden />
      <span className="torn-bottom" aria-hidden />
    </figure>
  );
}
