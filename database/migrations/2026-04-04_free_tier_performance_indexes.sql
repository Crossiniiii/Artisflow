-- Free-tier performance indexes for ArtisFlow / ProjectGalleria
-- Purpose:
-- 1. Speed up the most common reads used by the webapp.
-- 2. Reduce sort pressure on the Supabase free/NANO tier.
-- 3. Avoid failing if some tables/columns differ from the proposed schema.
--
-- Run in Supabase SQL Editor.
-- Recommended: restart the project first, then run this script during a quiet window.

create or replace function public.create_index_if_target_exists(
  p_index_name text,
  p_table_name text,
  p_index_sql text,
  p_required_columns text[] default '{}'
) returns void as $$
declare
  missing_count integer;
begin
  if to_regclass('public.' || p_table_name) is null then
    raise notice 'Skipping %. Table does not exist.', p_table_name;
    return;
  end if;

  select count(*)
  into missing_count
  from unnest(p_required_columns) as col
  where not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = p_table_name
      and column_name = col
  );

  if missing_count > 0 then
    raise notice 'Skipping index % on %. Required columns missing.', p_index_name, p_table_name;
    return;
  end if;

  if exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = p_index_name
  ) then
    raise notice 'Index % already exists.', p_index_name;
    return;
  end if;

  execute p_index_sql;
  raise notice 'Created index %.', p_index_name;
end;
$$ language plpgsql;

-- Highest priority: startup / sync / approvals
select public.create_index_if_target_exists(
  'idx_artworks_created_at_desc',
  'artworks',
  'create index idx_artworks_created_at_desc on public.artworks (created_at desc)',
  array['created_at']
);

select public.create_index_if_target_exists(
  'idx_artworks_status',
  'artworks',
  'create index idx_artworks_status on public.artworks (status)',
  array['status']
);

select public.create_index_if_target_exists(
  'idx_artworks_current_branch',
  'artworks',
  'create index idx_artworks_current_branch on public.artworks (current_branch)',
  array['current_branch']
);

select public.create_index_if_target_exists(
  'idx_sales_artwork_id',
  'sales',
  'create index idx_sales_artwork_id on public.sales (artwork_id)',
  array['artwork_id']
);

select public.create_index_if_target_exists(
  'idx_sales_status',
  'sales',
  'create index idx_sales_status on public.sales (status)',
  array['status']
);

select public.create_index_if_target_exists(
  'idx_sales_created_at_desc',
  'sales',
  'create index idx_sales_created_at_desc on public.sales (created_at desc)',
  array['created_at']
);

select public.create_index_if_target_exists(
  'idx_profiles_status_name',
  'profiles',
  'create index idx_profiles_status_name on public.profiles (status, name)',
  array['status', 'name']
);

-- Operational history pages
select public.create_index_if_target_exists(
  'idx_activity_logs_created_at_desc',
  'activity_logs',
  'create index idx_activity_logs_created_at_desc on public.activity_logs (created_at desc)',
  array['created_at']
);

select public.create_index_if_target_exists(
  'idx_activity_logs_artwork_id',
  'activity_logs',
  'create index idx_activity_logs_artwork_id on public.activity_logs (artwork_id)',
  array['artwork_id']
);

select public.create_index_if_target_exists(
  'idx_inventory_audits_created_at_desc',
  'inventory_audits',
  'create index idx_inventory_audits_created_at_desc on public.inventory_audits (created_at desc)',
  array['created_at']
);

select public.create_index_if_target_exists(
  'idx_import_records_imported_at_desc',
  'import_records',
  'create index idx_import_records_imported_at_desc on public.import_records (imported_at desc)',
  array['imported_at']
);

select public.create_index_if_target_exists(
  'idx_returns_created_at_desc',
  'returns',
  'create index idx_returns_created_at_desc on public.returns (created_at desc)',
  array['created_at']
);

select public.create_index_if_target_exists(
  'idx_returns_artwork_id',
  'returns',
  'create index idx_returns_artwork_id on public.returns (artwork_id)',
  array['artwork_id']
);

select public.create_index_if_target_exists(
  'idx_framer_records_created_at_desc',
  'framer_records',
  'create index idx_framer_records_created_at_desc on public.framer_records (created_at desc)',
  array['created_at']
);

select public.create_index_if_target_exists(
  'idx_framer_records_artwork_id',
  'framer_records',
  'create index idx_framer_records_artwork_id on public.framer_records (artwork_id)',
  array['artwork_id']
);

select public.create_index_if_target_exists(
  'idx_transfers_created_at_desc',
  'transfers',
  'create index idx_transfers_created_at_desc on public.transfers (created_at desc)',
  array['created_at']
);

select public.create_index_if_target_exists(
  'idx_transfers_artwork_id',
  'transfers',
  'create index idx_transfers_artwork_id on public.transfers (artwork_id)',
  array['artwork_id']
);

select public.create_index_if_target_exists(
  'idx_transfer_requests_status_created_at',
  'transfer_requests',
  'create index idx_transfer_requests_status_created_at on public.transfer_requests (status, created_at desc)',
  array['status', 'created_at']
);

-- Messaging / notifications
select public.create_index_if_target_exists(
  'idx_notifications_created_at_desc',
  'notifications',
  'create index idx_notifications_created_at_desc on public.notifications (created_at desc)',
  array['created_at']
);

select public.create_index_if_target_exists(
  'idx_messages_conversation_id_timestamp',
  'messages',
  'create index idx_messages_conversation_id_timestamp on public.messages (conversation_id, timestamp)',
  array['conversation_id', 'timestamp']
);

select public.create_index_if_target_exists(
  'idx_conversations_updated_at_desc',
  'conversations',
  'create index idx_conversations_updated_at_desc on public.conversations (updated_at desc)',
  array['updated_at']
);

do $$
begin
  if to_regclass('public.conversations') is null then
    raise notice 'Skipping GIN index for conversations. Table does not exist.';
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'conversations'
      and column_name = 'participant_ids'
  ) then
    raise notice 'Skipping GIN index for conversations.participant_ids. Column missing.';
    return;
  end if;

  if exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_conversations_participant_ids_gin'
  ) then
    raise notice 'Index idx_conversations_participant_ids_gin already exists.';
    return;
  end if;

  execute 'create index idx_conversations_participant_ids_gin on public.conversations using gin (participant_ids)';
  raise notice 'Created index idx_conversations_participant_ids_gin.';
end $$;

-- Branch/event support
select public.create_index_if_target_exists(
  'idx_branches_category',
  'branches',
  'create index idx_branches_category on public.branches (category)',
  array['category']
);

select public.create_index_if_target_exists(
  'idx_events_location',
  'events',
  'create index idx_events_location on public.events (location)',
  array['location']
);

select public.create_index_if_target_exists(
  'idx_events_created_at_desc',
  'events',
  'create index idx_events_created_at_desc on public.events (created_at desc)',
  array['created_at']
);

-- Cleanup helper
drop function if exists public.create_index_if_target_exists(text, text, text, text[]);
