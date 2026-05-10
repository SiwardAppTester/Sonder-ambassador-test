import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Card surface — floating above the canvas.
 *
 * The look is built from three things, layered:
 *   - A clear lift in lightness vs. the canvas background.
 *   - A soft drop shadow underneath (gives the floating feel).
 *   - A 1px inset rim-light on the top edge (the "glass" cue).
 *
 * Pass `interactive` to get the hover lift treatment used on grid cards.
 */
export const Card = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { interactive?: boolean }
>(function Card({ className, interactive, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-border/60 text-card-foreground surface-floating surface-glass-dim",
        interactive &&
          "transition-shadow hover:surface-floating-hover hover:border-border",
        className,
      )}
      {...props}
    />
  );
});
