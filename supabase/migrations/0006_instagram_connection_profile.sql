-- Sonder Ambassador feature — store IG profile snapshot on connections.
--
-- Every sync refreshes these so the dashboard can render counts/avatars
-- without an extra Graph API hop. They're nullable: existing rows from
-- 0005 won't have them until their next sync.

alter table public.instagram_connections
  add column if not exists ig_followers_count    integer,
  add column if not exists ig_follows_count      integer,
  add column if not exists ig_media_count        integer,
  add column if not exists ig_profile_picture_url text,
  add column if not exists ig_biography          text;

-- Refresh the public-safe view so the new columns surface to admin reads.
create or replace view public.instagram_connections_public
with (security_invoker = true) as
select
  c.id,
  c.organization_id,
  c.ambassador_id,
  c.ig_business_account_id,
  c.ig_username,
  c.fb_page_id,
  c.fb_page_name,
  c.scopes,
  c.connected_at,
  c.disconnected_at,
  c.last_synced_at,
  c.last_sync_error,
  c.token_expires_at,
  c.ig_followers_count,
  c.ig_follows_count,
  c.ig_media_count,
  c.ig_profile_picture_url,
  c.ig_biography
from public.instagram_connections c
where c.organization_id in (select public.caller_org_ids())
  and public.caller_has_permission(c.organization_id, 'ambassador.list.view');

grant select on public.instagram_connections_public to authenticated;
