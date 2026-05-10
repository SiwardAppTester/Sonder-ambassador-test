"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { useUpdateAmbassadorStatus } from "@/hooks/use-ambassadors";

/**
 * Brief: rejecting an application "opens a dialog requiring a reason
 * (stored on the ambassador record)". The reason is internal-only.
 */
export function RejectApplicationDialog({
  open,
  onClose,
  ambassadorId,
  ambassadorName,
}: {
  open: boolean;
  onClose: () => void;
  ambassadorId: string | null;
  ambassadorName: string;
}) {
  const update = useUpdateAmbassadorStatus();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ambassadorId) return;
    if (!reason.trim()) return setError("A reason is required.");
    try {
      await update.mutateAsync({
        id: ambassadorId,
        status: "rejected",
        rejectionReason: reason.trim(),
      });
      setReason("");
      setError(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject application");
    }
  }

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Reject application" size="sm">
      <DialogHeader
        title="Reject application"
        description={`Reason for rejecting ${ambassadorName}. Visible to internal admins only.`}
      />
      <form onSubmit={onSubmit}>
        <DialogBody>
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Off-brand content history, audience too small."
              rows={4}
              required
            />
            {error ? (
              <p className="text-xs text-status-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={update.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" disabled={update.isPending}>
            {update.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Reject
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
