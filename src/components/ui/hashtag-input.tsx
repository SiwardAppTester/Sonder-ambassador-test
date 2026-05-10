"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chip-style input for hashtags. Adds on Enter, comma, or blur. Removes
 * on backspace when input is empty, or by clicking the X on a chip.
 *
 * Stored values omit the leading `#` — that's a UI flourish only.
 */
export function HashtagInput({
  value,
  onChange,
  placeholder = "Add a hashtag and press Enter",
}: {
  value: readonly string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const tag = draft.trim().replace(/^#+/, "").toLowerCase();
    if (!tag) return;
    if (value.includes(tag)) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div
      className={cn(
        "field-fill flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-border/40 px-2.5 py-1.5 transition-colors",
        "hover:border-border/70 focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/20",
      )}
    >
      {value.map((tag, i) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-card px-2 py-1 text-xs text-foreground"
        >
          #{tag}
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Remove ${tag}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={value.length === 0 ? placeholder : ""}
        className="min-w-[120px] flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
      />
    </div>
  );
}
