"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Palette, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColorPicker } from "@/components/ui/color-picker";
import { useBrandColor } from "@/providers/organization-provider";

/** A handful of nice defaults. Free-form picking happens in the ColorPicker below. */
const PRESETS: readonly string[] = [
  "#5B8DEF", // blue
  "#7C5CFF", // violet
  "#5B8A86", // teal (demo default)
  "#E07A5F", // coral
  "#F2C94C", // amber
  "#E0418A", // pink
];

export function BrandCustomizer() {
  const { brandColor, setBrandColor } = useBrandColor();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Track trigger position so the portaled panel stays anchored on
  // resize / scroll. Panel sits to the right of the trigger, top-aligned.
  useEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    function update() {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      setCoords({ left: r.right + 12, top: r.top });
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  const panel =
    open && coords ? (
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Brand color"
        style={{ left: coords.left, top: coords.top }}
        className="surface-glass-strong fixed z-50 w-72 rounded-lg border border-border/60 p-3 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.55)]"
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Brand color
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-6 gap-1.5">
          {PRESETS.map((hex) => {
            const active = hex.toLowerCase() === brandColor.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                aria-label={`Set brand color to ${hex}`}
                aria-pressed={active}
                onClick={() => setBrandColor(hex)}
                className={cn(
                  "size-6 rounded-md ring-1 ring-inset ring-white/10 transition-transform hover:scale-110",
                  active && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                )}
                style={{ background: hex }}
              />
            );
          })}
        </div>

        <div className="mt-3">
          <ColorPicker value={brandColor} onChange={setBrandColor} />
        </div>

        <button
          type="button"
          onClick={() => setBrandColor(null)}
          className="mt-3 w-full rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Reset to default
        </button>
      </div>
    ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Customize brand color"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Palette className="size-[18px]" />
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
