"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { Drawer, DrawerBody, DrawerFooter, DrawerHeader } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { HashtagInput } from "@/components/ui/hashtag-input";
import { useUpdateCampaign } from "@/hooks/use-campaigns";
import type { Campaign } from "@/lib/types";

/**
 * Edit-campaign drawer — mirror of NewCampaignDrawer but seeded with the
 * existing campaign's values and wired to `useUpdateCampaign`. Only the
 * fields here are sent in the patch; status changes go through the
 * Publish/Pause/End buttons on the detail page (separate mutation).
 */
export function EditCampaignDrawer({
  open,
  onClose,
  campaign,
}: {
  open: boolean;
  onClose: () => void;
  campaign: Campaign;
}) {
  const update = useUpdateCampaign();

  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description ?? "");
  const [maxPointsCap, setMaxPointsCap] = useState<number | "">(campaign.maxPointsCap);
  const [pointsPerShare, setPointsPerShare] = useState<number | "">(campaign.pointsPerShare);
  const [pointsPer1kViews, setPointsPer1kViews] = useState<number | "">(campaign.pointsPer1kViews);
  const [range, setRange] = useState<DateRange | undefined>(() => ({
    from: campaign.startDate ? new Date(campaign.startDate) : undefined,
    to: campaign.endDate ? new Date(campaign.endDate) : undefined,
  }));
  const [hashtags, setHashtags] = useState<string[]>(() => [...campaign.hashtags]);
  const [error, setError] = useState<string | null>(null);

  // Re-seed when the drawer re-opens for a different campaign or after
  // an external update, so we never show stale form state.
  useEffect(() => {
    if (!open) return;
    setName(campaign.name);
    setDescription(campaign.description ?? "");
    setMaxPointsCap(campaign.maxPointsCap);
    setPointsPerShare(campaign.pointsPerShare);
    setPointsPer1kViews(campaign.pointsPer1kViews);
    setRange({
      from: campaign.startDate ? new Date(campaign.startDate) : undefined,
      to: campaign.endDate ? new Date(campaign.endDate) : undefined,
    });
    setHashtags([...campaign.hashtags]);
    setError(null);
  }, [open, campaign]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name is required");
    if (typeof maxPointsCap !== "number" || maxPointsCap <= 0) {
      return setError("Max points cap must be greater than 0");
    }
    if (typeof pointsPerShare !== "number" || pointsPerShare < 0) {
      return setError("Points per share must be 0 or higher");
    }
    if (typeof pointsPer1kViews !== "number" || pointsPer1kViews < 0) {
      return setError("Points per 1k views must be 0 or higher");
    }
    try {
      await update.mutateAsync({
        id: campaign.id,
        patch: {
          name: name.trim(),
          description: description.trim() || null,
          maxPointsCap,
          pointsPerShare,
          pointsPer1kViews,
          startDate: range?.from ? range.from.toISOString() : null,
          endDate: range?.to ? range.to.toISOString() : null,
          hashtags,
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update campaign");
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
    <Drawer open={open} onClose={onClose} ariaLabel="Edit campaign" size="md">
      <DrawerHeader
        title="Edit campaign"
        description="Update the basics. Status changes use Publish/Pause/End on the detail page."
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
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pps">Points per share</Label>
                <Input
                  id="pps"
                  type="number"
                  min={0}
                  step={1}
                  value={pointsPerShare}
                  onChange={(e) =>
                    setPointsPerShare(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pp1k">Points per 1k views</Label>
                <Input
                  id="pp1k"
                  type="number"
                  min={0}
                  step={1}
                  value={pointsPer1kViews}
                  onChange={(e) =>
                    setPointsPer1kViews(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Hashtags</Label>
              <HashtagInput value={hashtags} onChange={setHashtags} />
              <p className="text-[11px] text-muted-foreground">
                Press Enter or comma to add. Backspace removes the last chip.
              </p>
            </div>

            {error ? (
              <p className="text-sm text-status-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={update.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </DrawerFooter>
      </form>
    </Drawer>
  );
}
