-- Mobile public-browse demo seed (v2: 5 festivals, 10 campaigns, ~12 rewards).
--
-- Run this AFTER migrations 0008, 0009, 0010 are applied.
-- Idempotent — safe to re-run. Uses slugs as natural keys so re-running
-- inserts nothing extra; it only fills in rows that aren't there yet.
--
-- Apply: Supabase dashboard → SQL editor → paste → Run.
--
-- Image strategy: external Unsplash URLs (festival/concert/wristband
-- themes). For organizations: image_url column (added in 0008). For
-- rewards: image_url column (added in 0010). Campaign cover images aren't
-- modelled yet — the mobile UI falls back to the parent org image.

-- ─────────────────────────────────────────────────────────────────────────
-- Cleanup: remove the v1 "Sonder Demo Festival" if it exists, so the
-- catalog is the 5 deliberate festivals below (no stray single-campaign
-- festival left over). Cascades clean up its campaign + content + rewards
-- via foreign-key on-delete-cascade defined in 0001/0009.
-- ─────────────────────────────────────────────────────────────────────────

delete from public.organizations where slug = 'sonder-demo-festival';

-- ─────────────────────────────────────────────────────────────────────────
-- Helpers: a single DO block builds the 5 orgs + their campaigns +
-- rewards. Slug-existence checks keep this idempotent.
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  v_org_id uuid;
begin
  -- Festival 1: Lowlands
  if not exists (select 1 from public.organizations where slug = 'lowlands') then
    insert into public.organizations
      (name, slug, theme_color, is_public, image_url, location, description)
    values (
      'Lowlands',
      'lowlands',
      '#1e90ff',
      true,
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=80',
      'Biddinghuizen, NL',
      'Three days of music, art and ideas in the polder. Be part of it.'
    )
    returning id into v_org_id;

    insert into public.campaigns
      (organization_id, name, description, status, max_points_cap,
       is_public, points_per_share, points_per_1k_views, start_date, end_date)
    values
      (v_org_id, 'Lineup reveal — drop the trailer',
       'Share the lineup reveal trailer to your story on launch day.',
       'active', 1000000, true, 120, 50,
       now() - interval '5 days', now() + interval '40 days'),
      (v_org_id, 'Aftermovie countdown',
       'Tease the aftermovie 48h before the official drop.',
       'active', 500000, true, 80, 35,
       now() - interval '2 days', now() + interval '20 days');

    insert into public.rewards
      (organization_id, name, description, image_url,
       points_cost, total_stock, remaining_stock, is_active)
    values
      (v_org_id, 'Weekend camping pass',
       'Three-day pass with camping included.',
       'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80',
       2000, 20, 20, true),
      (v_org_id, 'Backstage hospitality',
       'VIP wristband + backstage hangout area access.',
       'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
       4500, 5, 5, true),
      (v_org_id, 'Lowlands merch bundle',
       'Official tee, tote bag and a screenprinted poster.',
       'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80',
       800, 100, 100, true);

    raise notice 'Seeded Lowlands → org %', v_org_id;
  end if;

  -- Festival 2: Awakenings
  if not exists (select 1 from public.organizations where slug = 'awakenings') then
    insert into public.organizations
      (name, slug, theme_color, is_public, image_url, location, description)
    values (
      'Awakenings',
      'awakenings',
      '#ff3b8b',
      true,
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=80',
      'Spaarnwoude, NL',
      'Techno from sunrise to sunrise. The world''s most iconic open-air.'
    )
    returning id into v_org_id;

    insert into public.campaigns
      (organization_id, name, description, status, max_points_cap,
       is_public, points_per_share, points_per_1k_views, start_date, end_date)
    values
      (v_org_id, 'Phase 1 lineup announce',
       'Share the phase 1 artist reveal grid the morning of release.',
       'active', 1000000, true, 100, 45,
       now() - interval '7 days', now() + interval '45 days'),
      (v_org_id, 'Tickets-on-sale push',
       'Story countdown for general sale: tap-to-buy sticker required.',
       'active', 750000, true, 90, 40,
       now() - interval '3 days', now() + interval '30 days');

    insert into public.rewards
      (organization_id, name, description, image_url,
       points_cost, total_stock, remaining_stock, is_active)
    values
      (v_org_id, 'Day ticket',
       'General admission ticket, single day of your choice.',
       'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&q=80',
       1500, 30, 30, true),
      (v_org_id, 'Open-air weekender',
       'Saturday + Sunday combo pass.',
       'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
       2800, 15, 15, true);

    raise notice 'Seeded Awakenings → org %', v_org_id;
  end if;

  -- Festival 3: Down the Rabbit Hole
  if not exists (select 1 from public.organizations where slug = 'down-the-rabbit-hole') then
    insert into public.organizations
      (name, slug, theme_color, is_public, image_url, location, description)
    values (
      'Down the Rabbit Hole',
      'down-the-rabbit-hole',
      '#7c5cff',
      true,
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80',
      'Beuningen, NL',
      'A curious world of music, art and stories — for the wide-eyed.'
    )
    returning id into v_org_id;

    insert into public.campaigns
      (organization_id, name, description, status, max_points_cap,
       is_public, points_per_share, points_per_1k_views, start_date, end_date)
    values
      (v_org_id, 'Site map sneak peek',
       'Drop the illustrated site map two weeks before doors open.',
       'active', 600000, true, 70, 30,
       now() - interval '1 day', now() + interval '25 days'),
      (v_org_id, 'Recap reel',
       'Short-form recap of last year''s edition; mention the festival handle.',
       'active', 400000, true, 60, 25,
       now() - interval '4 days', now() + interval '50 days');

    insert into public.rewards
      (organization_id, name, description, image_url,
       points_cost, total_stock, remaining_stock, is_active)
    values
      (v_org_id, 'Weekend pass + glamping',
       'Three-day pass including a pre-pitched glamping tent.',
       'https://images.unsplash.com/photo-1504851149312-7a075b496cc7?w=800&q=80',
       3500, 10, 10, true);

    raise notice 'Seeded Down the Rabbit Hole → org %', v_org_id;
  end if;

  -- Festival 4: Dekmantel
  if not exists (select 1 from public.organizations where slug = 'dekmantel') then
    insert into public.organizations
      (name, slug, theme_color, is_public, image_url, location, description)
    values (
      'Dekmantel',
      'dekmantel',
      '#ff8a00',
      true,
      'https://images.unsplash.com/photo-1571266028243-d220c6a32d2a?w=1200&q=80',
      'Amsterdam, NL',
      'Forward-thinking electronic music across the Amsterdamse Bos.'
    )
    returning id into v_org_id;

    insert into public.campaigns
      (organization_id, name, description, status, max_points_cap,
       is_public, points_per_share, points_per_1k_views, start_date, end_date)
    values
      (v_org_id, 'Lineup reveal',
       'Drop the full lineup grid on launch day at 10:00 CET.',
       'active', 800000, true, 110, 45,
       now() - interval '6 days', now() + interval '35 days'),
      (v_org_id, 'After-festival sets',
       'Tease the official recorded sets going live on Soundcloud.',
       'active', 500000, true, 75, 30,
       now() - interval '2 days', now() + interval '20 days');

    insert into public.rewards
      (organization_id, name, description, image_url,
       points_cost, total_stock, remaining_stock, is_active)
    values
      (v_org_id, 'Festival pass',
       'Three-day general admission pass.',
       'https://images.unsplash.com/photo-1535928750523-2f23bd7e9d34?w=800&q=80',
       2200, 25, 25, true),
      (v_org_id, 'Boat party upgrade',
       'Boat party add-on for ticket holders.',
       'https://images.unsplash.com/photo-1452830978618-d6feae7d0ffa?w=800&q=80',
       1200, 20, 20, true);

    raise notice 'Seeded Dekmantel → org %', v_org_id;
  end if;

  -- Festival 5: Best Kept Secret
  if not exists (select 1 from public.organizations where slug = 'best-kept-secret') then
    insert into public.organizations
      (name, slug, theme_color, is_public, image_url, location, description)
    values (
      'Best Kept Secret',
      'best-kept-secret',
      '#22c55e',
      true,
      'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200&q=80',
      'Hilvarenbeek, NL',
      'Indie, rock and hip-hop in a forest setting. Discover something new.'
    )
    returning id into v_org_id;

    insert into public.campaigns
      (organization_id, name, description, status, max_points_cap,
       is_public, points_per_share, points_per_1k_views, start_date, end_date)
    values
      (v_org_id, 'Forest stage reveal',
       'Share the new forest-stage construction photos as a carousel.',
       'active', 400000, true, 70, 30,
       now() - interval '3 days', now() + interval '40 days'),
      (v_org_id, 'Camping early-bird',
       'Push the early-bird camping upgrade — link sticker required.',
       'active', 300000, true, 60, 25,
       now() - interval '1 day', now() + interval '15 days');

    insert into public.rewards
      (organization_id, name, description, image_url,
       points_cost, total_stock, remaining_stock, is_active)
    values
      (v_org_id, 'Forest weekend pass',
       'Three-day pass with access to all stages and the forest area.',
       'https://images.unsplash.com/photo-1421789665209-c9b2a435e3dc?w=800&q=80',
       1900, 30, 30, true);

    raise notice 'Seeded Best Kept Secret → org %', v_org_id;
  end if;
end$$;
