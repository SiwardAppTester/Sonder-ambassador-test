-- Mobile public-browse seed — campaign content tiles + per-campaign
-- hashtags. Runs AFTER seed-mobile-public.sql and migration 0011.
--
-- Idempotent: each campaign gets content rows only if it has none yet,
-- and hashtags are set only if the column is currently empty.
--
-- Why a separate file: the original seed treats campaigns as the unit of
-- existence; this one fills detail rows so the mobile CampaignDetail
-- screen looks populated (matches the old mock-based UI).

-- ─────────────────────────────────────────────────────────────────────────
-- Populate campaign.hashtags where empty. Same set per festival is OK —
-- this is demo data; the admin can override per-campaign in the dashboard.
-- ─────────────────────────────────────────────────────────────────────────

update public.campaigns c
   set hashtags = case o.slug
     when 'lowlands'             then array['Lowlands','LL25','Polderparty']
     when 'awakenings'           then array['Awakenings','Techno','OpenAir']
     when 'down-the-rabbit-hole' then array['DTRH','RabbitHole','Wonderland']
     when 'dekmantel'            then array['Dekmantel','AmsterdamseBos','Electronic']
     when 'best-kept-secret'     then array['BKS','ForestStage','IndieRock']
     else array[]::text[]
   end
  from public.organizations o
 where c.organization_id = o.id
   and (c.hashtags is null or array_length(c.hashtags, 1) is null);

-- ─────────────────────────────────────────────────────────────────────────
-- Seed 4 content rows per campaign (2 image, 1 video, 1 copy). Skipped for
-- any campaign that already has at least one content row.
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  v_campaign record;
begin
  for v_campaign in
    select c.id, c.organization_id, c.points_per_share, c.points_per_1k_views,
           c.hashtags, c.name as campaign_name, o.slug as org_slug
      from public.campaigns c
      join public.organizations o on o.id = c.organization_id
     where c.is_public = true
       and c.status = 'active'
       and c.archived_at is null
       and not exists (
         select 1 from public.campaign_contents cc
          where cc.campaign_id = c.id
            and cc.archived_at is null
       )
  loop
    insert into public.campaign_contents
      (organization_id, campaign_id, type, file_path, image_url,
       file_size_bytes, points_per_share, points_per_1k_views,
       caption_template, hashtags, instructions, display_order)
    values
      -- Image 1
      (v_campaign.organization_id, v_campaign.id, 'image',
       'demo/' || v_campaign.org_slug || '/hero-1.jpg',
       'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80',
       102400,
       v_campaign.points_per_share, v_campaign.points_per_1k_views,
       'Big energy at ' || v_campaign.campaign_name || ' ✨',
       v_campaign.hashtags,
       'Post to your story; tag the festival handle.',
       1),
      -- Image 2
      (v_campaign.organization_id, v_campaign.id, 'image',
       'demo/' || v_campaign.org_slug || '/hero-2.jpg',
       'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80',
       102400,
       v_campaign.points_per_share, v_campaign.points_per_1k_views,
       'Counting down to ' || v_campaign.campaign_name,
       v_campaign.hashtags,
       'Carousel post — 2 to 4 frames recommended.',
       2),
      -- Video
      (v_campaign.organization_id, v_campaign.id, 'video',
       'demo/' || v_campaign.org_slug || '/teaser.mp4',
       'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80',
       512000,
       v_campaign.points_per_share + 20, v_campaign.points_per_1k_views,
       'You don''t want to miss this — see you there.',
       v_campaign.hashtags,
       'Reel format (9:16). Keep first second tight.',
       3),
      -- Image 3 (replaces a planned "copy" tile — the
      -- `campaign_content_type` enum currently only allows image/video.
      -- We can add 'copy' to the enum in a later migration if/when the
      -- desktop admin starts authoring text-only content.)
      (v_campaign.organization_id, v_campaign.id, 'image',
       'demo/' || v_campaign.org_slug || '/hero-3.jpg',
       'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
       102400,
       v_campaign.points_per_share, v_campaign.points_per_1k_views,
       'Just got my pass for ' || v_campaign.campaign_name ||
       '. Doors open soon — who''s in? 🙌',
       v_campaign.hashtags,
       'Single image post. Tag the festival.',
       4);
  end loop;
end$$;
