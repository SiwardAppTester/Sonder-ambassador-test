"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { Drawer, DrawerBody, DrawerFooter, DrawerHeader } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useCreateCampaign } from "@/hooks/use-campaigns";

/**
 * Stage 1 of the create-campaign flow per the brief: name, description,
 * cover image, start/end dates, max points cap. Submits a draft campaign
 * and routes to its detail page; content is added from there via the
 * Add-content drawer.
 *
 * Visually consistent with the Add-content flow — same right-side drawer
 * pattern so create + add-to feel like the same family of action.
 *
 * Cover image upload is deferred. Field will land alongside the campaign
 * cover signed-upload server action when grafted in.
 */
export function NewCampaignDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const create = useCreateCampaign();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxPointsCap, setMaxPointsCap] = useState<number | "">("");
  const [range, setRange] = useState<DateRange | undefined>();
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setDescription("");
    setMaxPointsCap("");
    setRange(undefined);
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name is required");
    if (typeof maxPointsCap !== "number" || maxPointsCap <= 0) {
      return setError("Max points cap must be greater than 0");
    }
    try {
      const created = await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        maxPointsCap,
        startDate: range?.from ? range.from.toISOString() : null,
        endDate: range?.to ? range.to.toISOString() : null,
      });
      reset();
      onClose();
      router.push(`/dashboard/ambassadors/campaigns/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    }
  }

  const formattedRange = (() => {
    if (!range?.from) return "Click two days to set the campaign window";
    const from = range.from.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (!range.to) return `${from} → pick end date`;
    const to = range.to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${from} → ${to}`;
  })();

  return (
    <Drawer open={open} onClose={onClose} ariaLabel="New campaign" size="md">
      <DrawerHeader
        title="New campaign"
        description="Set the basics now. You'll add content from the campaign page."
      />
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <DrawerBody>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Summer rooftop nights"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this campaign for?"
              />
            </div>

            <div className="space-y-2">
              <Label>Campaign dates</Label>
              <div className="field-fill relative rounded-xl border border-border/40 p-3">
                <DayPicker
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  numberOfMonths={1}
                  weekStartsOn={1}
                  classNames={{
                    root: "rdp-styled",
                    months: "flex justify-center",
                    month: "w-full",
                    month_caption: "flex items-center justify-center mb-3 text-sm font-medium text-foreground",
                    nav: "flex items-center justify-between absolute inset-x-2 top-2",
                    button_previous: "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                    button_next: "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                    chevron: "size-4 fill-current",
                    month_grid: "w-full border-collapse",
                    weekdays: "flex w-full",
                    weekday: "flex-1 text-[10px] uppercase tracking-wide font-medium text-muted-foreground py-1",
                    week: "flex w-full",
                    day: "flex-1 p-0 text-center text-[13px] aspect-square",
                    day_button: "inline-flex size-full items-center justify-center rounded-md text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent",
                    today: "font-semibold text-brand",
                    outside: "text-muted-foreground/40",
                    disabled: "text-muted-foreground/30",
                    selected: "",
                    range_start: "[&>button]:!bg-brand [&>button]:!text-white [&>button]:rounded-r-none",
                    range_end: "[&>button]:!bg-brand [&>button]:!text-white [&>button]:rounded-l-none",
                    range_middle: "bg-brand/15 [&>button]:!bg-transparent [&>button]:rounded-none [&>button]:hover:!bg-brand/25",
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">{formattedRange}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cap">Max points cap</Label>
              <Input
                id="cap"
                type="number"
                min={1}
                step={1}
                value={maxPointsCap}
                onChange={(e) =>
                  setMaxPointsCap(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="e.g. 50000"
                required
              />
            </div>

            {error ? (
              <p className="text-sm text-status-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Create campaign
          </Button>
        </DrawerFooter>
      </form>
    </Drawer>
  );
}
