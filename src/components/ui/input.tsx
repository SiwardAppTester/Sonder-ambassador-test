"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Form fields. The base style sits *recessed* into surrounding floating
 * cards — the surface is one notch darker than the canvas, so the field
 * reads as "well" rather than "raised pill." Focus state lifts to the
 * card surface and grows a brand-color ring; hover is just a quieter
 * border bump.
 */
const baseField =
  "field-fill flex w-full rounded-lg border border-border/40 text-foreground placeholder:text-muted-foreground/70 transition-[background-color,border-color,box-shadow] " +
  "hover:border-border/70 " +
  "focus-visible:outline-none focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/20 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = "text", ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(baseField, "h-10 px-3.5 text-sm", className)}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(baseField, "min-h-[88px] resize-y px-3.5 py-2.5 text-sm leading-relaxed", className)}
      {...props}
    />
  );
});

export function Label({
  children,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("text-xs font-medium text-foreground", className)}
    >
      {children}
    </label>
  );
}
