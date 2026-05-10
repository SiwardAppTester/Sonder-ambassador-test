"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useCreateReward, useUpdateReward } from "@/hooks/use-rewards";
import { useOrganization } from "@/providers/organization-provider";
import type { Reward } from "@/lib/types";

type Mode = "create" | "edit";

/**
 * Shared form for creating and editing rewards. The brief lists exactly
 * these fields: image, name, description, points cost, stock, active.
 * Image upload is a URL field for the demo — wires to the signed-upload
 * action when grafted into the real app.
 */
export function RewardForm({
  mode,
  initial,
}: {
  mode: Mode;
  initial?: Reward;
}) {
  const router = useRouter();
  const org = useOrganization();
  const create = useCreateReward();
  const update = useUpdateReward();
  const pending = create.isPending || update.isPending;

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [pointsCost, setPointsCost] = useState<number | "">(initial?.pointsCost ?? "");
  const [totalStock, setTotalStock] = useState<number | "">(initial?.totalStock ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Name is required");
    if (typeof pointsCost !== "number" || pointsCost <= 0)
      return setError("Points cost must be greater than 0");
    if (typeof totalStock !== "number" || totalStock < 0)
      return setError("Stock must be 0 or greater");

    try {
      if (mode === "create") {
        await create.mutateAsync({
          organizationId: org.id,
          name: name.trim(),
          description: description.trim() || null,
          imageUrl: imageUrl.trim() || null,
          pointsCost,
          totalStock,
          isActive,
        });
      } else if (initial) {
        await update.mutateAsync({
          id: initial.id,
          patch: {
            name: name.trim(),
            description: description.trim() || null,
            imageUrl: imageUrl.trim() || null,
            pointsCost,
            totalStock,
            // Keep existing remainingStock; admins reduce stock by raising/lowering
            // totalStock without resetting in-flight redemptions.
            isActive,
          },
        });
      }
      router.push("/dashboard/ambassadors/rewards");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save reward");
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5">
      <Card className="space-y-5 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Branded tote bag"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional — what the ambassador is redeeming."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="image">Image URL</Label>
          <Input
            id="image"
            type="url"
            value={imageUrl ?? ""}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
          />
          <p className="text-[11px] text-muted-foreground">
            Demo: paste a URL. Grafted to Sonder, this becomes a signed upload to{" "}
            <code className="rounded bg-muted px-1 py-0.5">reward-images</code>.
          </p>
        </div>
      </Card>

      <Card className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="points">Points cost</Label>
            <Input
              id="points"
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
            <Label htmlFor="stock">Total stock</Label>
            <Input
              id="stock"
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

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-background/40 px-3.5 py-3">
          <div>
            <Label>Active</Label>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Inactive rewards stay in the catalog but can&apos;t be redeemed.
            </p>
          </div>
          <Switch checked={isActive} onChange={setIsActive} ariaLabel="Active reward" />
        </div>
      </Card>

      {error ? (
        <p className="text-sm text-status-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {mode === "create" ? "Create reward" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
