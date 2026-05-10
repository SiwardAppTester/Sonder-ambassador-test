"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Drawer, DrawerBody, DrawerFooter, DrawerHeader } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useCreateReward } from "@/hooks/use-rewards";
import { useOrganization } from "@/providers/organization-provider";

/**
 * Right-side drawer for adding a reward. Mirrors the NewCampaignDrawer
 * pattern so create-flows feel like the same family of action.
 *
 * The standalone /rewards/new page is left in place as a fallback for
 * direct links/bookmarks; this drawer is the primary entry point from
 * the rewards catalog.
 */
export function NewRewardDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const org = useOrganization();
  const create = useCreateReward();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pointsCost, setPointsCost] = useState<number | "">("");
  const [totalStock, setTotalStock] = useState<number | "">("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setDescription("");
    setImageUrl("");
    setPointsCost("");
    setTotalStock("");
    setIsActive(true);
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name is required");
    if (typeof pointsCost !== "number" || pointsCost <= 0) {
      return setError("Points cost must be greater than 0");
    }
    if (typeof totalStock !== "number" || totalStock < 0) {
      return setError("Stock must be 0 or greater");
    }
    try {
      await create.mutateAsync({
        organizationId: org.id,
        name: name.trim(),
        description: description.trim() || null,
        imageUrl: imageUrl.trim() || null,
        pointsCost,
        totalStock,
        isActive,
      });
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create reward");
    }
  }

  return (
    <Drawer open={open} onClose={onClose} ariaLabel="New reward" size="md">
      <DrawerHeader
        title="New reward"
        description="Add a reward ambassadors can redeem with points."
      />
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <DrawerBody>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="reward-name">Name</Label>
              <Input
                id="reward-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Branded tote bag"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reward-description">Description</Label>
              <Textarea
                id="reward-description"
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
                <Label htmlFor="reward-points">Points cost</Label>
                <Input
                  id="reward-points"
                  type="number"
                  min={1}
                  step={1}
                  value={pointsCost}
                  onChange={(e) =>
                    setPointsCost(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="e.g. 500"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reward-stock">Total stock</Label>
                <Input
                  id="reward-stock"
                  type="number"
                  min={0}
                  step={1}
                  value={totalStock}
                  onChange={(e) =>
                    setTotalStock(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="e.g. 50"
                  required
                />
              </div>
            </div>

            <div className="field-fill flex items-center justify-between gap-4 rounded-xl border border-border/40 px-4 py-3">
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
          <Button type="button" variant="ghost" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Create reward
          </Button>
        </DrawerFooter>
      </form>
    </Drawer>
  );
}
