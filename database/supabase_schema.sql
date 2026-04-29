-- PROPOSED SUPABASE SCHEMA FOR ARTISFLOW
create extension if not exists pgcrypto;

-- 1. Enums
create type user_role as enum ('Inventory Personnel', 'Sales Agent', 'Admin', 'Exclusive');
create type artwork_status as enum ('Available', 'Reserved', 'Sold', 'Delivered', 'Cancelled', 'View Only (Exclusive)', 'For Retouch', 'For Framing', 'For Sale Approval');
create type event_status as enum ('Live', 'Upcoming', 'Recent');
create type event_type as enum ('Exhibition', 'Auction');
create type transfer_status as enum ('Pending', 'Accepted', 'Declined', 'Cancelled', 'On Hold');

-- 2. Profiles (Linked to auth.users)
create table profiles (
  id uuid primary key,
  name text not null,
  email text unique not null,
  role user_role default 'Sales Agent',
  status text check (status in ('Active', 'Inactive')) default 'Active',
  first_name text,
  full_name text,
  position text,
  branch text,
  permissions jsonb, -- Stores UserPermissions interface
  last_login timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- 3. Events
create table events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  location text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  status event_status default 'Upcoming',
  type event_type default 'Exhibition',
  artwork_ids uuid[] default '{}',
  is_strict_duration boolean default false,
  is_timeless boolean default false,
  logo_url text,
  created_at timestamp with time zone default now()
);

-- 4. Artworks
create table artworks (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  title text not null,
  artist text not null,
  medium text,
  dimensions text,
  year text,
  price numeric(12, 2) default 0,
  status artwork_status default 'Available',
  current_branch text,
  image_url text,
  itdr_image_url text,
  rsa_image_url text,
  or_cr_image_url text,
  remarks text,
  reservation_expiry timestamp with time zone,
  reserved_for_event_id uuid references events(id) on delete set null,
  reserved_for_event_name text,
  size_frame text,
  sold_at_branch text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 5. Sales Records
create table sales (
  id uuid default gen_random_uuid() primary key,
  artwork_id uuid references artworks(id) on delete set null,
  client_name text not null,
  client_email text,
  client_contact text,
  agent_name text not null,
  sale_date timestamp with time zone default now(),
  delivery_date timestamp with time zone,
  is_delivered boolean default false,
  is_cancelled boolean default false,
  status text,
  attachment_url text,
  itdr_url text[],
  rsa_url text[],
  or_cr_url text[],
  sold_at_event_id uuid references events(id) on delete set null,
  sold_at_event_name text,
  downpayment numeric(12, 2) default 0,
  artwork_snapshot jsonb, -- Stores the state of the artwork at time of sale
  installments jsonb default '[]',
  created_at timestamp with time zone default now()
);

-- 6. Transfer Requests
create table transfer_requests (
  id uuid default gen_random_uuid() primary key,
  artwork_id uuid references artworks(id) on delete cascade,
  from_branch text not null,
  to_branch text not null,
  status transfer_status default 'Pending',
  requested_by text not null,
  requested_at timestamp with time zone default now(),
  responded_by text,
  responded_at timestamp with time zone,
  notes text,
  itdr_url text,
  created_at timestamp with time zone default now()
);

-- 7. Audit Logs
create table audit_logs (
  id uuid default gen_random_uuid() primary key,
  artwork_id uuid references artworks(id) on delete set null,
  action text not null,
  user_name text not null,
  user_id uuid references profiles(id) on delete set null,
  details text,
  artwork_snapshot jsonb,
  timestamp timestamp with time zone default now()
);

-- 8. Conversations & Chat
create table conversations (
  id uuid default gen_random_uuid() primary key,
  participant_ids uuid[] not null,
  participant_names jsonb not null,
  last_message jsonb,
  unread_count jsonb default '{}',
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

create table messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete set null,
  sender_name text not null,
  text text not null,
  read_by uuid[] default '{}',
  timestamp timestamp with time zone default now()
);

-- 9. Branches
create table branches (
  name text primary key,
  address text,
  category text default 'Gallery',
  logo_url text,
  is_exclusive boolean default false,
  created_at timestamp with time zone default now()
);

-- 10. Transfers (Completed)
create table transfers (
  id text primary key,
  artwork_id uuid references artworks(id) on delete set null,
  artwork_title text,
  origin text,
  destination text,
  timestamp timestamp with time zone default now(),
  performed_by text,
  approved_by text,
  notes text,
  created_at timestamp with time zone default now()
);

-- 11. Notifications
create table notifications (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  message text not null,
  type text not null, -- 'system', 'transfer', 'sale', 'event'
  is_read boolean default false,
  artwork_id uuid references artworks(id) on delete set null,
  items jsonb default '[]',
  timestamp timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- 11. Activity Logs (Redundant with audit_logs? but let's keep consistency with useActivityLogs.ts)
create table activity_logs (
  id uuid default gen_random_uuid() primary key,
  artwork_id uuid references artworks(id) on delete set null,
  action text not null,
  user_name text not null,
  user_id uuid references profiles(id) on delete set null,
  details text,
  artwork_snapshot jsonb,
  timestamp timestamp with time zone default now()
);

-- 12. Returns & Framer Records
create table returns (
  id uuid default gen_random_uuid() primary key,
  artwork_id uuid references artworks(id) on delete cascade,
  return_date timestamp with time zone default now(),
  reason text,
  returned_by text,
  artwork_snapshot jsonb,
  return_type text,
  status text default 'Open',
  proof_image text,
  reference_number text,
  remarks text,
  resolved_at timestamp with time zone,
  resolved_to_branch text,
  created_at timestamp with time zone default now()
);

create table framer_records (
  id uuid default gen_random_uuid() primary key,
  artwork_id uuid references artworks(id) on delete cascade,
  sent_date timestamp with time zone default now(),
  damage_details text,
  artwork_snapshot jsonb,
  status text,
  resolved_at timestamp with time zone,
  resolved_to_branch text,
  created_at timestamp with time zone default now()
);

-- 13. Storage Buckets (Manual via UI or SQL if supported by current role)
-- Buckets to create: 'images', 'attachments'

-- 10. Basic Row Level Security (RLS)
alter table profiles enable row level security;
alter table artworks enable row level security;
alter table sales enable row level security;
alter table audit_logs enable row level security;
alter table branches enable row level security;
alter table framer_records enable row level security;
alter table returns enable row level security;
alter table import_records enable row level security;

-- Policies (Simplified Examples)
-- profile_read: Anyone authenticated can read profiles
create policy "Authenticated users can read profiles" on profiles for select using (auth.role() = 'authenticated');

create policy "Admins and Inventory can manage profiles" on profiles
  for all using (get_my_role() in ('Admin', 'Inventory Personnel'));

-- artwork_read: Anyone authenticated can read artworks
create policy "Authenticated users can read artworks" on artworks for select using (auth.role() = 'authenticated');

-- artwork_write: Only Admin or Inventory personnel can update artworks
-- Note: Requires a function to check role from profiles table
create or replace function get_my_role() returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer;

create policy "Admins and Inventory can update artworks" on artworks 
  for all using (get_my_role() in ('Admin', 'Inventory Personnel'));

create policy "Authenticated users can read branches" on branches
  for select using (auth.role() = 'authenticated');

create policy "Admins and Inventory can manage branches" on branches
  for all using (get_my_role() in ('Admin', 'Inventory Personnel'));

create policy "Authenticated users can read sales" on sales
  for select using (auth.role() = 'authenticated');

create policy "Admins, Inventory, and Sales Agents can manage sales" on sales
  for all using (get_my_role() in ('Admin', 'Inventory Personnel', 'Sales Agent'));

-- Framer Records
create policy "Authenticated users can read framer records" on framer_records
  for select using (auth.role() = 'authenticated');
create policy "All authenticated users can insert framer records" on framer_records
  for insert with check (auth.role() = 'authenticated');
create policy "Admins and Inventory can manage framer records" on framer_records
  for all using (get_my_role() in ('Admin', 'Inventory Personnel'));

-- Returns
create policy "Authenticated users can read returns" on returns
  for select using (auth.role() = 'authenticated');
create policy "All authenticated users can insert returns" on returns
  for insert with check (auth.role() = 'authenticated');
create policy "Admins and Inventory can manage returns" on returns
  for all using (get_my_role() in ('Admin', 'Inventory Personnel'));

-- Import Records
create policy "Authenticated users can read import records" on import_records
  for select using (auth.role() = 'authenticated');
create policy "All authenticated users can insert import records" on import_records
  for insert with check (auth.role() = 'authenticated');
create policy "Admins and Inventory can manage import records" on import_records
  for all using (get_my_role() in ('Admin', 'Inventory Personnel'));

-- 11. Settings
create table settings (
  id text primary key, -- e.g. 'webapp_settings'
  prevent_duplicate_imports boolean default true,
  updated_at timestamp with time zone default now()
);

alter table settings enable row level security;
create policy "Anyone authenticated can read settings" on settings for select using (auth.role() = 'authenticated');
create policy "Admins and Inventory can manage settings" on settings for all using (get_my_role() in ('Admin', 'Inventory Personnel'));

-- 12. Monitoring Summaries
create table monitoring_summaries (
  id text primary key,
  month integer not null,
  year integer not null,
  created_by text,
  created_at timestamp with time zone default now(),
  beginning_inventory integer default 0,
  total_items_in integer default 0,
  total_items_out_sold integer default 0,
  total_items_out_transfer integer default 0,
  available_inventory integer default 0,
  sold_pieces_still_in_gallery integer default 0,
  total_inventory integer default 0,
  is_physical_check_confirmed boolean default false,
  physical_check_confirmed_at timestamp with time zone,
  physical_check_confirmed_by text,
  items_in jsonb default '[]',
  items_out_sold jsonb default '[]',
  items_out_transfer jsonb default '[]'
);

alter table monitoring_summaries enable row level security;
create policy "Authenticated users can read summaries" on monitoring_summaries for select using (auth.role() = 'authenticated');
create policy "Admins and Inventory can manage summaries" on monitoring_summaries for all using (get_my_role() in ('Admin', 'Inventory Personnel'));

create or replace function accept_transfer_request(
  p_request_id uuid,
  p_responded_by text,
  p_new_artwork_status artwork_status
) returns void as $$
declare
  request_record transfer_requests%rowtype;
begin
  select *
  into request_record
  from transfer_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Transfer request % not found', p_request_id;
  end if;

  update transfer_requests
  set status = 'Accepted',
      responded_by = p_responded_by,
      responded_at = now()
  where id = p_request_id;

  update artworks
  set current_branch = request_record.to_branch,
      status = p_new_artwork_status
  where id = request_record.artwork_id;

  insert into transfers (
    id,
    artwork_id,
    artwork_title,
    origin,
    destination,
    timestamp,
    performed_by,
    approved_by,
    notes
  ) values (
    gen_random_uuid()::text,
    request_record.artwork_id,
    request_record.artwork_title,
    request_record.from_branch,
    request_record.to_branch,
    now(),
    request_record.requested_by,
    p_responded_by,
    'Accepted'
  );
end;
$$ language plpgsql security definer;
