"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Drawer, DrawerBody, DrawerFooter, DrawerHeader } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useUpdateReward } from "@/hooks/use-rewards";
import type { Reward } from "@/lib/types";

/**
 * Edit a reward in the same right-side drawer as create. Re-syncs local
 * state when `reward` changes so opening the drawer for a different reward
 * resets the form.
 *
 * Note: changing `totalStock` doesn't reset `remainingStock` — that keeps
 * in-flight redemptions stable when admins raise/lower the cap.
 */
export function EditRewardDrawer({
  reward,
  open,
  onClose,
}: {
  reward: Reward | null;
  open: boolean;
  onClose: () => void;
}) {
  const update = useUpdateReward();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pointsCost, setPointsCost] = useState<number | "">("");
  const [totalStock, setTotalStock] = useState<number | "">("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync local state when the target reward changes (or the drawer reopens
  // for a fresh one). Without this, switching rewards leaves stale values.
  useEffect(() => {
    if (!reward) return;
    setName(reward.name);
    setDescription(reward.description ?? "");
    setImageUrl(reward.imageUrl ?? "");
    setPointsCost(reward.pointsCost);
    setTotalStock(reward.totalStock);
    setIsActive(reward.isActive);
    setError(null);
  }, [reward]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!reward) return;
    setError(null);
    if (!name.trim()) return setError("Name is required");
    if (typeof pointsCost !== "number" || pointsCost <= 0) {
      return setError("Points cost must be greater than 0");
    }
    if (typeof totalStock !== "number" || totalStock < 0) {
      return setError("Stock must be 0 or greater");
    }
    try {
      await update.mutateAsync({
        id: reward.id,
        patch: {
          name: name.trim(),
          description: description.trim() || null,
          imageUrl: imageUrl.trim() || null,
          pointsCost,
          totalStock,
          isActive,
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    }
  }

  return (
    <Drawer open={open} onClose={onClose} ariaLabel="Edit reward" size="md">
      <DrawerHeader
        title="Edit reward"
        description="Update the reward details. Stock changes don't reset open redemptions."
      />
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <DrawerBody>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="edit-reward-name">Name</Label>
              <Input
                id="edit-reward-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Branded tote bag"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-reward-description">Description</Label>
              <Textarea
                id="edit-reward-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional — what the ambassador is redeeming."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Image</Label>
              <ImageUploader value={imageUrl} onChange={setImageUrl} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-reward-points">Points cost</Label>
                <Input
                  id="edit-reward-points"
                  type="number"
                  min={1}
                  step={1}
                  value={pointsCost}
                  onChange={(e) =>
                    setPointsCost(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-reward-stock">Total stock</Label>
                <Input
                  id="edit-reward-stock"
                  type="number"
                  min={0}
                  step={1}
                  value={totalStock}
                  onChange={(e) =>
                    setTotalStock(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-muted/30 px-4 py-3">
              <div>
                <Label>Active</Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Inactive rewards stay in the catalog but can&apos;t be redeemed.
                </p>
              </div>
              <Switch checked={isActive} onChange={setIsActive} ariaLabel="Active reward" />
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
