"use client";

import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Drawer — slides in from the right edge. Same backdrop-blur treatment as
 * the Dialog so the two feel like siblings. Used for the Add-content flow
 * inside campaign detail.
 *
 * - Closes on backdrop click + ESC
 * - Locks body scroll while open
 * - Width controlled by `size`; on mobile it goes full-width.
 */
export function Drawer({
  open,
  onClose,
  children,
  size = "md",
  ariaLabel,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  ariaLabel: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const widthClass =
    size === "sm" ? "w-full sm:w-[400px]" : size === "lg" ? "w-full sm:w-[640px]" : "w-full sm:w-[480px]";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="drawer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-md"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "absolute inset-y-0 right-0 flex h-full flex-col rounded-l-2xl border-l border-border/40 bg-card surface-floating",
              widthClass,
            )}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="absolute right-4 top-4 z-10 inline-flex size-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function DrawerHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-border/40 px-7 py-6 pr-14">
      <h2 className="text-lg font-semibold leading-tight tracking-tight text-foreground">
        {title}
      </h2>
      {description ? (
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function DrawerBody({ children }: { children: ReactNode }) {
  return <div className="flex-1 overflow-y-auto px-7 py-6">{children}</div>;
}

export function DrawerFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-border/40 px-7 py-4">
      {children}
    </div>
  );
}
