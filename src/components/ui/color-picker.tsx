"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Inline HSV color picker — saturation/value square + hue slider + hex input.
 *
 * Internally tracks HSV (so dragging to grayscale doesn't lose the user's
 * hue). The parent owns `value` (hex); we sync from it when it changes
 * externally (e.g. from a preset click or a reset).
 */
type HSV = { h: number; s: number; v: number };

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0,
    gp = 0,
    bp = 0;
  if (h < 60) {
    rp = c;
    gp = x;
  } else if (h < 120) {
    rp = x;
    gp = c;
  } else if (h < 180) {
    gp = c;
    bp = x;
  } else if (h < 240) {
    gp = x;
    bp = c;
  } else if (h < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  return { r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 };
}

function hexToHsv(hex: string): HSV {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 0, s: 0, v: 0 };
  return rgbToHsv(rgb.r, rgb.g, rgb.b);
}

function hsvToHex(hsv: HSV): string {
  const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
  return rgbToHex(r, g, b);
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(value));
  const [hexDraft, setHexDraft] = useState(value.toUpperCase());
  const squareRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Sync from external value changes (preset click, reset). Compare
  // against the picker's computed hex so we don't fight ourselves when
  // the parent's update echoes back.
  useEffect(() => {
    if (value.toLowerCase() !== hsvToHex(hsv).toLowerCase()) {
      setHsv(hexToHsv(value));
      setHexDraft(value.toUpperCase());
    }
    // Only sync on external value change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function commit(next: HSV) {
    setHsv(next);
    const hex = hsvToHex(next);
    setHexDraft(hex.toUpperCase());
    onChange(hex);
  }

  function updateFromPointer(clientX: number, clientY: number) {
    if (!squareRef.current) return;
    const rect = squareRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    commit({ h: hsv.h, s: x, v: 1 - y });
  }

  function onSquarePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  }

  function onSquarePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    updateFromPointer(e.clientX, e.clientY);
  }

  function onSquarePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function onHueChange(e: React.ChangeEvent<HTMLInputElement>) {
    commit({ h: Number(e.target.value), s: hsv.s, v: hsv.v });
  }

  function onHexChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setHexDraft(raw.toUpperCase());
    const cleaned = raw.startsWith("#") ? raw : `#${raw}`;
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
      setHsv(hexToHsv(cleaned));
      onChange(cleaned.toLowerCase());
    }
  }

  const hueColor = `hsl(${hsv.h}, 100%, 50%)`;
  const thumbXPct = hsv.s * 100;
  const thumbYPct = (1 - hsv.v) * 100;

  return (
    <div className="space-y-3">
      <div
        ref={squareRef}
        onPointerDown={onSquarePointerDown}
        onPointerMove={onSquarePointerMove}
        onPointerUp={onSquarePointerUp}
        onPointerCancel={onSquarePointerUp}
        className="relative h-32 w-full cursor-crosshair touch-none overflow-hidden rounded-md border border-border/60"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${hueColor}`,
        }}
      >
        <div
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
          style={{ left: `${thumbXPct}%`, top: `${thumbYPct}%` }}
        />
      </div>

      <input
        type="range"
        min={0}
        max={360}
        value={Math.round(hsv.h)}
        onChange={onHueChange}
        aria-label="Hue"
        className="hue-slider h-2 w-full cursor-pointer appearance-none rounded-full"
      />

      <div className="flex items-center gap-2">
        <div
          aria-hidden
          className="size-7 shrink-0 rounded-md border border-border/60"
          style={{ background: hsvToHex(hsv) }}
        />
        <input
          type="text"
          value={hexDraft}
          onChange={onHexChange}
          spellCheck={false}
          aria-label="Hex color"
          placeholder="#000000"
          className="h-7 flex-1 rounded-md border border-border/60 bg-transparent px-2 font-mono text-xs uppercase tracking-wider text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
        />
      </div>
    </div>
  );
}
