"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { Instagram, RefreshCw, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
import { Dialog, DialogBody, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { AmbassadorWithConnection } from "@/app/api/instagram/ambassadors/route";

/**
 * Sidebar trigger + centered modal for the Instagram Graph API test
 * connection.
 *
 * Why the portal: the sidebar uses `backdrop-filter` (surface-glass-strong),
 * which makes it the containing block for any descendant `position: fixed`
 * element. Without a portal, the Dialog's full-viewport backdrop would be
 * clipped to the 72px sidebar. Same fix BrandCustomizer uses next door.
 *
 * Flow:
 *   1. Pick an ambassador in the modal.
 *   2. "Connect Instagram" → /api/instagram/connect → Facebook OAuth → callback
 *   3. After callback we land back on the dashboard with ?ig=connected|error;
 *      the panel reads that and shows a status banner.
 *   4. For a connected ambassador, "Sync now" pulls fresh posts.
 *
 * The connect button lives in the sidebar for *testing*; in production it
 * moves to the mobile app, but the callback + sync routes stay the same.
 */
export function InstagramConnect() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dialog = (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      ariaLabel="Instagram connections"
      size="md"
    >
      <DialogHeader
        title="Instagram connections"
        description="Test the Graph API integration. Pick an ambassador, sign in with Instagram, then sync their posts. (This panel is for testing — in production the connect flow lives in the mobile app.)"
      />
      <DialogBody>
        <ConnectionsPanel />
      </DialogBody>
    </Dialog>
  );

  return (
    <>
      <button
        type="button"
        aria-label="Instagram connections (test)"
        onClick={() => setOpen(true)}
        className="flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Instagram className="size-[18px]" />
      </button>
      {mounted ? createPortal(dialog, document.body) : null}
    </>
  );
}

function ConnectionsPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const igStatus = searchParams.get("ig");
  const igHandle = searchParams.get("handle");
  const igReason = searchParams.get("reason");

  const [ambassadors, setAmbassadors] = useState<AmbassadorWithConnection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch("/api/instagram/ambassadors", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const json = (await res.json()) as { ambassadors: AmbassadorWithConnection[] };
      setAmbassadors(json.ambassadors);
      if (!selectedId && json.ambassadors[0]) setSelectedId(json.ambassadors[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ambassadors");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After the OAuth callback we land here; reload so the new connection shows.
  useEffect(() => {
    if (igStatus) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [igStatus]);

  function clearFlash() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("ig");
    params.delete("handle");
    params.delete("reason");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  const selected = useMemo(
    () => ambassadors?.find((a) => a.id === selectedId) ?? null,
    [ambassadors, selectedId],
  );

  async function onSync(connectionId: string) {
    setSyncing(connectionId);
    try {
      const res = await fetch("/api/instagram/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? `Sync failed (${res.status})`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(null);
    }
  }

  async function onDisconnect(connectionId: string) {
    setDisconnecting(connectionId);
    try {
      const res = await fetch("/api/instagram/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      if (!res.ok) throw new Error(`Disconnect failed (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setDisconnecting(null);
    }
  }

  const options = useMemo(
    () =>
      (ambassadors ?? []).map((a) => ({
        value: a.id,
        label:
          [a.firstName, a.lastName].filter(Boolean).join(" ") ||
          a.instagramHandle ||
          a.id.slice(0, 8),
      })),
    [ambassadors],
  );

  return (
    <div className="space-y-5">
      {igStatus === "connected" ? (
        <FlashBanner
          variant="success"
          message={`Connected as @${igHandle ?? "instagram"}`}
          onDismiss={clearFlash}
        />
      ) : null}
      {igStatus === "error" ? (
        <FlashBanner
          variant="error"
          message={`Connection failed: ${decodeURIComponent(igReason ?? "unknown")}`}
          onDismiss={clearFlash}
        />
      ) : null}
      {error ? <FlashBanner variant="error" message={error} onDismiss={() => setError(null)} /> : null}

      <section>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Ambassador
        </label>
        {ambassadors === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : ambassadors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No ambassadors found. Run the seed script first.
          </p>
        ) : (
          <Select
            value={selectedId}
            onChange={setSelectedId}
            options={options}
            ariaLabel="Select ambassador"
            className="w-full"
          />
        )}
      </section>

      {selected ? (
        <section className="rounded-xl border border-border/40 bg-muted/20 p-4">
          {selected.connection ? (
            <ConnectedView
              ambassador={selected}
              syncing={syncing === selected.connection.id}
              disconnecting={disconnecting === selected.connection.id}
              onSync={() => onSync(selected.connection!.id)}
              onDisconnect={() => onDisconnect(selected.connection!.id)}
            />
          ) : (
            <NotConnectedView ambassadorId={selected.id} />
          )}
        </section>
      ) : null}
    </div>
  );
}

function NotConnectedView({ ambassadorId }: { ambassadorId: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Not connected. Click below to sign in with Facebook and authorize access to the linked
        Instagram Business account.
      </p>
      <a href={`/api/instagram/connect?ambassadorId=${encodeURIComponent(ambassadorId)}`}>
        <Button variant="primary" size="md" className="w-full">
          <Instagram className="size-4" />
          Connect Instagram
        </Button>
      </a>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Requires an Instagram Business or Creator account linked to a Facebook Page you manage.
      </p>
    </div>
  );
}

function ConnectedView({
  ambassador,
  syncing,
  disconnecting,
  onSync,
  onDisconnect,
}: {
  ambassador: AmbassadorWithConnection;
  syncing: boolean;
  disconnecting: boolean;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  const c = ambassador.connection!;
  const lastSync = c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleString() : "Never";
  const expires = c.tokenExpiresAt ? new Date(c.tokenExpiresAt).toLocaleDateString() : "Unknown";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-status-success" />
            <a
              href={`https://instagram.com/${c.igUsername}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-foreground hover:underline"
            >
              @{c.igUsername}
              <ExternalLink className="ml-1 inline size-3 text-muted-foreground" />
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Connected {new Date(c.connectedAt).toLocaleDateString()} · token expires {expires}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-border/40 bg-background/40 p-2.5">
          <dt className="text-muted-foreground">Posts synced</dt>
          <dd className="mt-0.5 text-base font-semibold text-foreground">{c.postCount}</dd>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/40 p-2.5">
          <dt className="text-muted-foreground">Last sync</dt>
          <dd className="mt-0.5 text-[13px] font-medium text-foreground">{lastSync}</dd>
        </div>
      </dl>

      {c.lastSyncError ? (
        <div className="flex gap-2 rounded-lg border border-status-danger/30 bg-status-danger/10 p-2.5 text-xs text-status-danger">
          <AlertCircle className="size-4 shrink-0" />
          <span>Last sync error: {c.lastSyncError}</span>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={onSync} disabled={syncing} className="flex-1">
          <RefreshCw className={syncing ? "size-4 animate-spin" : "size-4"} />
          {syncing ? "Syncing…" : "Sync now"}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDisconnect}
          disabled={disconnecting}
        >
          {disconnecting ? "…" : "Disconnect"}
        </Button>
      </div>
    </div>
  );
}

function FlashBanner({
  variant,
  message,
  onDismiss,
}: {
  variant: "success" | "error";
  message: string;
  onDismiss: () => void;
}) {
  const styles =
    variant === "success"
      ? "border-status-success/30 bg-status-success/10 text-status-success"
      : "border-status-danger/30 bg-status-danger/10 text-status-danger";
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${styles}`}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-current opacity-70 transition-opacity hover:opacity-100"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
