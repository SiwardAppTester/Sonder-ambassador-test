"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Click or drag-drop image uploader. Stores the picked file as a base64
 * data URL — fine for the mock data layer where the URL is just persisted
 * in memory. When this is wired to real storage (Supabase signed upload),
 * replace the FileReader path with a fetch to the signed URL and store the
 * returned public URL on `onChange`.
 */
export function ImageUploader({
  value,
  onChange,
  aspectClass = "aspect-[4/3]",
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  aspectClass?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function readFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") onChange(result);
    };
    reader.readAsDataURL(file);
  }

  function onPickerChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    // Reset so picking the same file again still triggers onChange.
    e.target.value = "";
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  if (value) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border/40",
          aspectClass,
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="" className="size-full object-cover" />
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Remove image"
          className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragOver) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
          aspectClass,
          dragOver
            ? "border-brand/60 bg-brand/5"
            : "field-fill border-border/50 hover:border-border/80",
          className,
        )}
      >
        <ImagePlus className="size-6 text-muted-foreground" />
        <p className="text-[12px] font-medium text-foreground">Click or drag to upload</p>
        <p className="text-[10px] text-muted-foreground">PNG, JPG, GIF, WebP</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onPickerChange}
        className="hidden"
      />
    </>
  );
}
