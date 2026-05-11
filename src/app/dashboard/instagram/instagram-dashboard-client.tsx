"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  Info,
  Instagram,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  Play,
  RefreshCw,
  Repeat2,
  Reply,
  RotateCw,
  Send,
  Users,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatCount } from "@/lib/format";
import type { AmbassadorWithConnection } from "@/app/api/instagram/ambassadors/route";
import type { InstagramPostRow } from "@/app/api/instagram/posts/route";
import type { InstagramStoryRow } from "@/app/api/instagram/stories/route";

/**
 * Top-level Instagram page. Handles:
 *   - listing ambassadors + their connection state
 *   - opening OAuth in a popup window and listening for completion
 *   - rendering profile card + post grid for the selected ambassador
 *
 * The "Connect Instagram" button uses window.open + postMessage instead of
 * a full-page redirect so the rest of the dashboard state stays put.
 */
export function InstagramDashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ambassadors, setAmbassadors] = useState<AmbassadorWithConnection[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [posts, setPosts] = useState<InstagramPostRow[] | null>(null);
  const [stories, setStories] = useState<InstagramStoryRow[] | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: "success" | "error"; msg: string } | null>(null);
  const popupRef = useRef<Window | null>(null);

  const loadAmbassadors = useCallback(async () => {
    try {
      const res = await fetch("/api/instagram/ambassadors", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const json = (await res.json()) as { ambassadors: AmbassadorWithConnection[] };
      setAmbassadors(json.ambassadors);
      setSelectedId((prev) => prev || json.ambassadors[0]?.id || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ambassadors");
    }
  }, []);

  const loadPosts = useCallback(async (ambassadorId: string) => {
    setLoadingPosts(true);
    try {
      // Posts + stories in parallel — they're independent.
      const [postsRes, storiesRes] = await Promise.all([
        fetch(`/api/instagram/posts?ambassadorId=${encodeURIComponent(ambassadorId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/instagram/stories?ambassadorId=${encodeURIComponent(ambassadorId)}`, {
          cache: "no-store",
        }),
      ]);
      if (!postsRes.ok) throw new Error(`Failed to load posts (${postsRes.status})`);
      const postsJson = (await postsRes.json()) as { posts: InstagramPostRow[] };
      setPosts(postsJson.posts);
      if (storiesRes.ok) {
        const storiesJson = (await storiesRes.json()) as { stories: InstagramStoryRow[] };
        setStories(storiesJson.stories);
      } else {
        setStories([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load posts");
      setPosts([]);
      setStories([]);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    void loadAmbassadors();
  }, [loadAmbassadors]);

  useEffect(() => {
    if (selectedId) void loadPosts(selectedId);
  }, [selectedId, loadPosts]);

  // Surface flags from full-page OAuth redirect (in case popup is blocked
  // and the connect call fell back to a normal redirect).
  useEffect(() => {
    const ig = searchParams.get("ig");
    const handle = searchParams.get("handle");
    const reason = searchParams.get("reason");
    if (ig === "connected") {
      setFlash({ kind: "success", msg: `Connected as @${handle ?? "instagram"}` });
      void loadAmbassadors();
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete("ig");
      sp.delete("handle");
      sp.delete("reason");
      router.replace(sp.toString() ? `?${sp.toString()}` : "?", { scroll: false });
    } else if (ig === "error") {
      setFlash({ kind: "error", msg: `Connection failed: ${decodeURIComponent(reason ?? "")}` });
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete("ig");
      sp.delete("handle");
      sp.delete("reason");
      router.replace(sp.toString() ? `?${sp.toString()}` : "?", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Listen for popup OAuth completion via postMessage.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { source?: string; ig?: string; handle?: string; reason?: string };
      if (data?.source !== "ig-oauth") return;
      if (data.ig === "connected") {
        setFlash({ kind: "success", msg: `Connected as @${data.handle ?? "instagram"}` });
      } else {
        setFlash({ kind: "error", msg: `Connection failed: ${data.reason ?? "unknown"}` });
      }
      void loadAmbassadors();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [loadAmbassadors]);

  const selected = useMemo(
    () => ambassadors?.find((a) => a.id === selectedId) ?? null,
    [ambassadors, selectedId],
  );

  function openConnectPopup(ambassadorId: string) {
    const url = `/api/instagram/connect?ambassadorId=${encodeURIComponent(ambassadorId)}&popup=1`;
    const w = 600;
    const h = 720;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    const features = `width=${w},height=${h},left=${left},top=${top},popup=yes,noopener=no`;
    const popup = window.open(url, "ig-oauth", features);
    if (!popup) {
      // Popup blocked — fall back to full redirect.
      window.location.href = url.replace("&popup=1", "");
      return;
    }
    popupRef.current = popup;
    popup.focus?.();
  }

  async function onSync() {
    if (!selected?.connection) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/instagram/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ connectionId: selected.connection.id }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? `Sync failed (${res.status})`);
      }
      await Promise.all([loadAmbassadors(), loadPosts(selected.id)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function onDisconnect() {
    if (!selected?.connection) return;
    if (!window.confirm(`Disconnect @${selected.connection.igUsername}?`)) return;
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/instagram/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ connectionId: selected.connection.id }),
      });
      if (!res.ok) throw new Error(`Disconnect failed (${res.status})`);
      await loadAmbassadors();
      setPosts(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  }

  const ambassadorOptions = useMemo(
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

  const headerAction = selected ? (
    selected.connection ? (
      <Button variant="outline" size="md" onClick={() => openConnectPopup(selected.id)}>
        <Instagram className="size-4" />
        Reconnect
      </Button>
    ) : (
      <Button variant="primary" size="md" onClick={() => openConnectPopup(selected.id)}>
        <Instagram className="size-4" />
        Sign in with Instagram
      </Button>
    )
  ) : null;

  return (
    <PageShell
      title="Instagram"
      description="Connect an ambassador's Instagram account and pull their post data via the Graph API."
      actions={headerAction}
    >
      <div className="space-y-6">
        {flash ? (
          <FlashBanner
            kind={flash.kind}
            message={flash.msg}
            onDismiss={() => setFlash(null)}
          />
        ) : null}
        {error ? (
          <FlashBanner kind="error" message={error} onDismiss={() => setError(null)} />
        ) : null}

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Ambassador
          </label>
          {ambassadors === null ? (
            <span className="text-sm text-muted-foreground">Loading…</span>
          ) : ambassadors.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              No ambassadors. Run the seed script first.
            </span>
          ) : (
            <Select
              value={selectedId}
              onChange={setSelectedId}
              options={ambassadorOptions}
              ariaLabel="Select ambassador"
              className="min-w-[240px]"
            />
          )}
        </div>

        {selected ? (
          selected.connection ? (
            <ConnectedView
              ambassador={selected}
              posts={posts}
              stories={stories}
              loadingPosts={loadingPosts}
              syncing={syncing}
              disconnecting={disconnecting}
              onSync={onSync}
              onDisconnect={onDisconnect}
            />
          ) : (
            <NotConnectedView
              ambassadorName={selected.firstName ?? selected.instagramHandle ?? "this ambassador"}
              onConnect={() => openConnectPopup(selected.id)}
            />
          )
        ) : null}
      </div>
    </PageShell>
  );
}

function NotConnectedView({
  ambassadorName,
  onConnect,
}: {
  ambassadorName: string;
  onConnect: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 px-8 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <Instagram className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">No Instagram connected</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Connect {ambassadorName}&apos;s Instagram Business or Creator account (linked to a Facebook
        Page they manage) to start pulling their post data.
      </p>
      <Button variant="primary" size="md" className="mt-5" onClick={onConnect}>
        <Instagram className="size-4" />
        Sign in with Instagram
      </Button>
    </div>
  );
}

function ConnectedView({
  ambassador,
  posts,
  stories,
  loadingPosts,
  syncing,
  disconnecting,
  onSync,
  onDisconnect,
}: {
  ambassador: AmbassadorWithConnection;
  posts: InstagramPostRow[] | null;
  stories: InstagramStoryRow[] | null;
  loadingPosts: boolean;
  syncing: boolean;
  disconnecting: boolean;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  const c = ambassador.connection!;
  const lastSync = c.lastSyncedAt ? new Date(c.lastSyncedAt).toLocaleString() : "Never";
  const tokenExpires = c.tokenExpiresAt
    ? new Date(c.tokenExpiresAt).toLocaleDateString()
    : "Unknown";
  const hasInsightsScope = c.scopes.includes("instagram_manage_insights");

  return (
    <div className="space-y-6">
      <ProfileCard
        username={c.igUsername}
        avatarUrl={c.igProfilePictureUrl}
        bio={c.igBiography}
        followers={c.igFollowersCount}
        follows={c.igFollowsCount}
        mediaCount={c.igMediaCount}
        postsSynced={c.postCount}
        lastSync={lastSync}
        tokenExpires={tokenExpires}
        syncing={syncing}
        disconnecting={disconnecting}
        onSync={onSync}
        onDisconnect={onDisconnect}
      />

      <PermissionStatus
        scopes={c.scopes}
        hasInsightsScope={hasInsightsScope}
        lastSyncError={c.lastSyncError}
      />

      <StoriesSection stories={stories} loading={loadingPosts} />

      <PostsGrid posts={posts} loading={loadingPosts} />
    </div>
  );
}

function PermissionStatus({
  scopes,
  hasInsightsScope,
  lastSyncError,
}: {
  scopes: string[];
  hasInsightsScope: boolean;
  lastSyncError: string | null;
}) {
  return (
    <section className="rounded-xl border border-border/40 bg-card/40 p-4">
      <header className="mb-2 flex items-center gap-2">
        <Lock className="size-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Token permissions
        </h3>
      </header>
      <div className="flex flex-wrap items-center gap-1.5">
        {scopes.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            No scope info on this connection (reconnect to populate).
          </span>
        ) : (
          scopes.map((s) => (
            <span
              key={s}
              className={
                s === "instagram_manage_insights"
                  ? "rounded-md border border-status-success/30 bg-status-success/10 px-2 py-0.5 text-[11px] font-medium text-status-success"
                  : "rounded-md border border-border/50 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground"
              }
            >
              {s}
            </span>
          ))
        )}
      </div>
      {!hasInsightsScope && scopes.length > 0 ? (
        <p className="mt-2.5 text-xs text-status-danger">
          <strong>instagram_manage_insights</strong> is missing from this token. Views/Reach/
          Impressions/Shares/Saves cannot be fetched. Click <em>Reconnect</em> above and approve
          the additional permission. If Meta&apos;s consent screen doesn&apos;t list it, the
          permission isn&apos;t enabled on the Meta app yet.
        </p>
      ) : null}
      {lastSyncError ? (
        <p className="mt-2.5 text-xs text-status-danger">
          <strong>Last sync diagnostic:</strong> {lastSyncError}
        </p>
      ) : null}
    </section>
  );
}

function ProfileCard({
  username,
  avatarUrl,
  bio,
  followers,
  follows,
  mediaCount,
  postsSynced,
  lastSync,
  tokenExpires,
  syncing,
  disconnecting,
  onSync,
  onDisconnect,
}: {
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  followers: number | null;
  follows: number | null;
  mediaCount: number | null;
  postsSynced: number;
  lastSync: string;
  tokenExpires: string;
  syncing: boolean;
  disconnecting: boolean;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  return (
    <section className="rounded-xl border border-border/40 bg-card/50 p-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <div className="flex shrink-0 items-center gap-4">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={`@${username}`}
              referrerPolicy="no-referrer"
              className="size-20 rounded-full border border-border/40 object-cover"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full border border-border/40 bg-muted">
              <Instagram className="size-7 text-muted-foreground" />
            </div>
          )}
          <div>
            <a
              href={`https://instagram.com/${username}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground hover:underline"
            >
              @{username}
              <ExternalLink className="size-3.5 text-muted-foreground" />
            </a>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-status-success">
              <CheckCircle2 className="size-3.5" />
              Connected
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {bio ? (
            <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{bio}</p>
          ) : null}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Followers" value={followers} icon={<Users className="size-3.5" />} />
            <Stat label="Following" value={follows} />
            <Stat label="IG posts" value={mediaCount} />
            <Stat label="Posts synced" value={postsSynced} highlight />
          </dl>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Last sync: {lastSync} · Token expires: {tokenExpires}
          </p>
        </div>

        <div className="flex shrink-0 flex-row gap-2 md:flex-col">
          <Button variant="primary" size="sm" onClick={onSync} disabled={syncing}>
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
    </section>
  );
}

function Stat({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number | null;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-lg border border-brand/30 bg-brand/5 p-2.5"
          : "rounded-lg border border-border/40 bg-background/40 p-2.5"
      }
    >
      <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-base font-semibold text-foreground">
        {value === null || value === undefined ? "—" : formatCount(value)}
      </dd>
    </div>
  );
}

function PostsGrid({
  posts,
  loading,
}: {
  posts: InstagramPostRow[] | null;
  loading: boolean;
}) {
  if (loading || posts === null) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-border/40 bg-card/30 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading posts…
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 px-8 py-12 text-center">
        <ImageIcon className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">No posts synced yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Click &ldquo;Sync now&rdquo; above to pull this account&apos;s recent posts.
        </p>
      </div>
    );
  }

  return (
    <section>
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Recent posts ({posts.length})
        </h2>
        <ReachHint />
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    </section>
  );
}

function PostCard({ post }: { post: InstagramPostRow }) {
  const [flipped, setFlipped] = useState(false);
  const isVideo = post.mediaType === "VIDEO" || post.mediaType === "REEL";
  const thumb = post.thumbnailUrl ?? post.mediaUrl;

  // Pull every metric we currently know about. Missing ones stay null so
  // the back of the card renders "—" with the locked-scope hint.
  const m = post.insights ?? {};
  const reach = numberOrNull(m.reach);
  // Meta unified video view metrics under `views` in 2024; older accounts
  // may still return `video_views` (legacy video) or `plays` (legacy reels).
  const views = numberOrNull(m.views ?? m.video_views ?? m.plays);
  // total_interactions = likes + comments + shares + saves rolled up. We
  // surface it as its own chip; impressions was deprecated in v21 so we
  // don't request it anymore.
  const totalInteractions = numberOrNull(m.total_interactions);
  const shares = numberOrNull(m.shares);
  const saves = numberOrNull(m.saved);

  return (
    <div className="[perspective:1200px]">
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        aria-pressed={flipped}
        aria-label={flipped ? "Show post image" : "Show post details"}
        className="group relative block aspect-square w-full overflow-visible rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        <motion.div
          className="relative size-full"
          style={{ transformStyle: "preserve-3d" }}
          // initial={false} skips the mount animation. framer-motion injects
          // an inline transform on mount that often differs between SSR and
          // client → React #418 hydration error. Skipping init keeps the
          // server output and the first client render byte-identical.
          initial={false}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* FRONT */}
          <div
            className="absolute inset-0 overflow-hidden rounded-xl border border-border/40 bg-card/50"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          >
            <div className="relative size-full bg-muted">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumb}
                  alt={post.caption?.slice(0, 60) ?? "Instagram post"}
                  referrerPolicy="no-referrer"
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="size-8" />
                </div>
              )}
              {isVideo ? (
                <div className="absolute right-2 top-2 rounded-full bg-black/55 p-1 text-white backdrop-blur-sm">
                  <Play className="size-3.5" fill="currentColor" />
                </div>
              ) : null}
              {/* Bottom overlay: caption + quick stats */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-2.5 text-white">
                {post.caption ? (
                  <p className="mb-1 line-clamp-2 text-[11px] leading-snug">{post.caption}</p>
                ) : null}
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="size-3" /> {formatCount(post.likeCount)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="size-3" /> {formatCount(post.commentsCount)}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 opacity-70">
                    <RotateCw className="size-3" /> Details
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BACK */}
          <div
            className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card/95 p-3"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {post.mediaType.replace("_", " ").toLowerCase()}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(post.postedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <RotateCw className="size-3 shrink-0 text-muted-foreground" />
            </div>

            <div className="grid flex-1 grid-cols-2 gap-2 text-xs">
              <MetricChip
                icon={<Eye className="size-3" />}
                label="Views"
                value={views}
                requiresInsights={!isVideo ? "n/a" : true}
              />
              <MetricChip
                icon={<Users className="size-3" />}
                label="Reach"
                value={reach}
                requiresInsights
              />
              <MetricChip
                icon={<Send className="size-3" />}
                label="Engagement"
                value={totalInteractions}
                requiresInsights
              />
              <MetricChip
                icon={<Repeat2 className="size-3" />}
                label="Shares"
                value={shares}
                requiresInsights={post.mediaType === "IMAGE" ? "n/a" : true}
              />
              <MetricChip
                icon={<Heart className="size-3" />}
                label="Likes"
                value={post.likeCount}
              />
              <MetricChip
                icon={<MessageCircle className="size-3" />}
                label="Comments"
                value={post.commentsCount}
              />
              <MetricChip
                icon={<Bookmark className="size-3" />}
                label="Saves"
                value={saves}
                requiresInsights
              />
              <a
                href={post.permalink ?? "#"}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 py-1.5 text-foreground transition-colors hover:bg-muted/60"
                aria-label="Open on Instagram"
              >
                <ExternalLink className="size-3" />
                Open
              </a>
            </div>
          </div>
        </motion.div>
      </button>
    </div>
  );
}

function MetricChip({
  icon,
  label,
  value,
  requiresInsights,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  /** true = needs insights scope; "n/a" = not applicable to this media type. */
  requiresInsights?: boolean | "n/a";
}) {
  const isNA = requiresInsights === "n/a";
  const isLocked = requiresInsights === true && value === null;

  return (
    <div
      className="flex flex-col justify-between gap-1 rounded-md border border-border/40 bg-background/40 p-2"
      title={
        isNA
          ? `${label} not tracked for this post type`
          : isLocked
            ? `${label} requires the instagram_manage_insights scope`
            : undefined
      }
    >
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span>{label}</span>
        {isLocked ? <Lock className="ml-auto size-2.5 opacity-50" /> : null}
      </div>
      <div className="text-right text-sm font-semibold text-foreground">
        {isNA ? <span className="text-xs text-muted-foreground/60">—</span> : value === null ? <span className="text-muted-foreground/60">—</span> : formatCount(value)}
      </div>
    </div>
  );
}

function numberOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function ReachHint() {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
      title="Per-post reach/impressions require the instagram_manage_insights scope. Enable it in Meta dashboard → Use Cases, then re-sync."
    >
      <Info className="size-3" />
      Reach shows &ldquo;—&rdquo; until insights scope is enabled
    </span>
  );
}

function FlashBanner({
  kind,
  message,
  onDismiss,
}: {
  kind: "success" | "error";
  message: string;
  onDismiss: () => void;
}) {
  const styles =
    kind === "success"
      ? "border-status-success/30 bg-status-success/10 text-status-success"
      : "border-status-danger/30 bg-status-danger/10 text-status-danger";
  const Icon = kind === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${styles}`}>
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

function StoriesSection({
  stories,
  loading,
}: {
  stories: InstagramStoryRow[] | null;
  loading: boolean;
}) {
  if (loading || stories === null) return null;

  // Stories are ephemeral on Meta's side — empty is the common case.
  // Render a compact empty state so the section always exists at the same
  // place in the layout (otherwise the page layout shifts when stories
  // appear/disappear between syncs).
  return (
    <section>
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Stories ({stories.length})
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Last 7 days. Instagram deletes stories from the Graph API after 24h, so
            anything older than that is what we synced before it expired.
          </p>
        </div>
      </header>

      {stories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-card/40 px-4 py-8 text-center">
          <p className="text-xs text-muted-foreground">
            No active or recently-synced stories. Stories appear here after a Sync if
            this account currently has any live.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {stories.map((s) => (
            <StoryCard key={s.id} story={s} />
          ))}
        </div>
      )}
    </section>
  );
}

function StoryCard({ story }: { story: InstagramStoryRow }) {
  const [flipped, setFlipped] = useState(false);
  const m = story.insights ?? {};
  const reach = numberOrNull(m.reach);
  // `impressions` (v21) and `views` (v22+) are the same thing for stories.
  const views = numberOrNull(m.views ?? m.impressions);
  const replies = numberOrNull(m.replies);
  // Meta consolidated taps_forward/back/exits into `navigation` in 2024.
  // Old keys may still be present for some accounts; render either.
  const tapsForward = numberOrNull(m.taps_forward);
  const tapsBack = numberOrNull(m.taps_back);
  const exits = numberOrNull(m.exits);
  const isVideo = story.mediaType === "VIDEO";
  const thumb = story.thumbnailUrl ?? story.mediaUrl;

  return (
    <div className="[perspective:1200px]">
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        aria-pressed={flipped}
        className="group relative block aspect-[9/16] w-full overflow-visible rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        <motion.div
          className="relative size-full"
          style={{ transformStyle: "preserve-3d" }}
          initial={false}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* FRONT */}
          <div
            className="absolute inset-0 overflow-hidden rounded-xl border border-border/40 bg-card/50"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          >
            <div className="relative size-full bg-muted">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumb}
                  alt="Story"
                  referrerPolicy="no-referrer"
                  className="size-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="size-8" />
                </div>
              )}
              {isVideo ? (
                <div className="absolute right-2 top-2 rounded-full bg-black/55 p-1 text-white backdrop-blur-sm">
                  <Play className="size-3.5" fill="currentColor" />
                </div>
              ) : null}
              <div className="absolute left-2 top-2">
                <span
                  className={
                    story.isActive
                      ? "rounded-full bg-status-success/90 px-1.5 py-0.5 text-[10px] font-medium uppercase text-white"
                      : "rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-medium uppercase text-white/80 backdrop-blur-sm"
                  }
                >
                  {story.isActive ? "Live" : "Expired"}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 text-white">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="size-3" /> {views !== null ? formatCount(views) : "—"}
                  </span>
                  <span className="inline-flex items-center gap-1 opacity-70">
                    <RotateCw className="size-3" /> Details
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BACK */}
          <div
            className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card/95 p-2.5"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="mb-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Story</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(story.postedAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-1.5 text-[11px]">
              <MetricChip icon={<Eye className="size-3" />} label="Views" value={views} requiresInsights />
              <MetricChip icon={<Users className="size-3" />} label="Reach" value={reach} requiresInsights />
              <MetricChip icon={<Reply className="size-3" />} label="Replies" value={replies} requiresInsights />
              <MetricChip icon={<LogOut className="size-3" />} label="Exits" value={exits} requiresInsights />
              <MetricChip icon={<ChevronRight className="size-3" />} label="Tap fwd" value={tapsForward} requiresInsights />
              <MetricChip icon={<ChevronLeft className="size-3" />} label="Tap back" value={tapsBack} requiresInsights />
            </div>
          </div>
        </motion.div>
      </button>
    </div>
  );
}
