"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Trash2, UploadCloud, Video } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Drag-and-drop file input that mirrors the constraints from the brief
 * (server-side validation in `src/server-actions/uploads.ts` is the source
 * of truth — these limits exist for UX feedback only).
 */
const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_MIMES = ["video/mp4", "video/quicktime"];
const IMAGE_MAX = 10 * 1024 * 1024; // 10 MB
const VIDEO_MAX = 100 * 1024 * 1024; // 100 MB

export type FileDropPick = {
  file: File;
  /** Object URL for preview. Caller must `URL.revokeObjectURL` on unmount. */
  previewUrl: string;
  type: "image" | "video";
};

function validate(file: File): { ok: true; type: "image" | "video" } | { ok: false; reason: string } {
  if (IMAGE_MIMES.includes(file.type)) {
    if (file.size > IMAGE_MAX) return { ok: false, reason: "Image exceeds 10 MB limit" };
    return { ok: true, type: "image" };
  }
  if (VIDEO_MIMES.includes(file.type)) {
    if (file.size > VIDEO_MAX) return { ok: false, reason: "Video exceeds 100 MB limit" };
    return { ok: true, type: "video" };
  }
  return { ok: false, reason: `Unsupported file type: ${file.type || "unknown"}` };
}

export function FileDrop({
  value,
  onChange,
}: {
  value: FileDropPick | null;
  onChange: (next: FileDropPick | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Revoke the object URL when the component unmounts or the value swaps,
  // so we don't leak blob references for the lifetime of the page.
  useEffect(() => {
    return () => {
      if (value?.previewUrl) URL.revokeObjectURL(value.previewUrl);
    };
  }, [value?.previewUrl]);

  const handle = useCallback(
    (file: File | null) => {
      setError(null);
      if (!file) return;
      const v = validate(file);
      if (!v.ok) {
        setError(v.reason);
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      onChange({ file, previewUrl, type: v.type });
    },
    [onChange],
  );

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    handle(file);
    // Reset so the same file can be picked twice in a row.
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handle(e.dataTransfer.files?.[0] ?? null);
  }

  if (value) {
    return (
      <div className="overflow-hidden rounded-lg border border-border/60">
        <div className="relative aspect-[4/5] bg-muted">
          {value.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.previewUrl} alt="" className="size-full object-cover" />
          ) : (
            <video src={value.previewUrl} className="size-full object-cover" controls />
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-background/40 px-3 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            {value.type === "image" ? (
              <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <Video className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate text-foreground">{value.file.name}</span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              {formatBytes(value.file.size)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Remove file"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "flex aspect-[4/5] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed transition-colors",
          dragOver
            ? "border-brand bg-brand/5"
            : "border-border/70 bg-background/30 hover:border-border hover:bg-muted/40",
        )}
      >
        <UploadCloud className="size-7 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium text-foreground">Drop a file here</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          JPG, PNG, WebP up to 10 MB · MP4, MOV up to 100 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={[...IMAGE_MIMES, ...VIDEO_MIMES].join(",")}
          onChange={onPick}
          className="hidden"
        />
      </div>
      {error ? (
        <p className="mt-2 text-xs text-status-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
