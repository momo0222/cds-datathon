-- ============================================
-- TRVL APP — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL)
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  email text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- TRIPS
-- ============================================
create table public.trips (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  destination text not null,
  cover_emoji text default '✈️',
  color text default '#2D5A8E',
  start_date date not null,
  end_date date not null,
  total_budget numeric(10,2) default 0,
  currency text default 'USD',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- TRIP MEMBERS (sharing / collaboration)
-- ============================================
create type member_role as enum ('owner', 'editor', 'viewer');

create table public.trip_members (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role member_role default 'viewer',
  invited_by uuid references public.profiles(id),
  joined_at timestamptz default now(),
  unique(trip_id, user_id)
);

-- ============================================
-- DAYS
-- ============================================
create table public.days (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  date date not null,
  label text, -- e.g. "Arrival Day", "Shibuya & Harajuku"
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ============================================
-- ITINERARY ITEMS
-- ============================================
create type item_type as enum ('flight', 'hotel', 'transport', 'activity', 'restaurant');
create type item_status as enum ('confirmed', 'pending', 'suggestion', 'cancelled');

create table public.itinerary_items (
  id uuid default uuid_generate_v4() primary key,
  day_id uuid references public.days(id) on delete cascade not null,
  trip_id uuid references public.trips(id) on delete cascade not null,
  type item_type not null,
  status item_status default 'suggestion',
  title text not null,
  detail text,
  time time,
  end_time time,
  location_name text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  booking_ref text,
  booking_url text,
  cost numeric(10,2) default 0,
  currency text default 'USD',
  notes text,
  added_by uuid references public.profiles(id),
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- EXPENSES (budget tracking)
-- ============================================
create type expense_category as enum (
  'flight', 'hotel', 'transport', 'food', 'activity', 'shopping', 'other'
);

create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  item_id uuid references public.itinerary_items(id) on delete set null,
  category expense_category not null,
  description text not null,
  amount numeric(10,2) not null,
  currency text default 'USD',
  paid_by uuid references public.profiles(id),
  split_between uuid[] default '{}',
  date date,
  created_at timestamptz default now()
);

-- ============================================
-- SHARED LINKS (public share)
-- ============================================
create table public.shared_links (
  id uuid default uuid_generate_v4() primary key,
  trip_id uuid references public.trips(id) on delete cascade not null,
  slug text unique not null, -- e.g. "tokyo-2026-abc123"
  allow_suggestions boolean default false,
  expires_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.days enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.expenses enable row level security;
alter table public.shared_links enable row level security;

-- Helper functions to avoid policy recursion (trips <-> trip_members)
create or replace function public.is_trip_owner(trip uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.trips t
    where t.id = trip
      and t.owner_id = uid
  );
$$;

create or replace function public.is_trip_member(trip uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.trip_members tm
    where tm.trip_id = trip
      and tm.user_id = uid
  );
$$;

create or replace function public.can_edit_trip(trip uuid, uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_trip_owner(trip, uid)
  or exists(
    select 1
    from public.trip_members tm
    where tm.trip_id = trip
      and tm.user_id = uid
      and tm.role in ('owner','editor')
  );
$$;

-- Profiles: users can read any profile, update own
drop policy if exists "Profiles: read all" on public.profiles;
drop policy if exists "Profiles: update own" on public.profiles;
create policy "Profiles: read all" on public.profiles for select using (true);
create policy "Profiles: update own" on public.profiles for update using (auth.uid() = id);

-- Trips: members can read, owner can do everything
drop policy if exists "Trips: members can read" on public.trips;
drop policy if exists "Trips: owner can insert" on public.trips;
drop policy if exists "Trips: owner can update" on public.trips;
drop policy if exists "Trips: owner can delete" on public.trips;
create policy "Trips: members can read" on public.trips for select
  using (public.is_trip_owner(id, auth.uid()) or public.is_trip_member(id, auth.uid()));
create policy "Trips: owner can insert" on public.trips for insert with check (owner_id = auth.uid());
create policy "Trips: owner can update" on public.trips for update using (public.is_trip_owner(id, auth.uid()));
create policy "Trips: owner can delete" on public.trips for delete using (public.is_trip_owner(id, auth.uid()));

-- Trip members: trip members can read, owner/editors can manage
drop policy if exists "Members: members can read" on public.trip_members;
drop policy if exists "Members: owner can manage" on public.trip_members;
create policy "Members: members can read" on public.trip_members for select
  using (public.is_trip_member(trip_id, auth.uid()) or public.is_trip_owner(trip_id, auth.uid()) or user_id = auth.uid());
create policy "Members: owner can manage" on public.trip_members for all
  using (public.can_edit_trip(trip_id, auth.uid()));

-- Days: trip members can read, editors+ can write
drop policy if exists "Days: members can read" on public.days;
drop policy if exists "Days: editors can manage" on public.days;
create policy "Days: members can read" on public.days for select
  using (public.is_trip_owner(trip_id, auth.uid()) or public.is_trip_member(trip_id, auth.uid()));
create policy "Days: editors can manage" on public.days for all
  using (public.can_edit_trip(trip_id, auth.uid()));

-- Itinerary items: same pattern
drop policy if exists "Items: members can read" on public.itinerary_items;
drop policy if exists "Items: editors can manage" on public.itinerary_items;
create policy "Items: members can read" on public.itinerary_items for select
  using (public.is_trip_owner(trip_id, auth.uid()) or public.is_trip_member(trip_id, auth.uid()));
create policy "Items: editors can manage" on public.itinerary_items for all
  using (public.can_edit_trip(trip_id, auth.uid()));

-- Expenses: same pattern
drop policy if exists "Expenses: members can read" on public.expenses;
drop policy if exists "Expenses: editors can manage" on public.expenses;
create policy "Expenses: members can read" on public.expenses for select
  using (public.is_trip_owner(trip_id, auth.uid()) or public.is_trip_member(trip_id, auth.uid()));
create policy "Expenses: editors can manage" on public.expenses for all
  using (public.can_edit_trip(trip_id, auth.uid()));

-- Shared links: owner can manage
drop policy if exists "Links: anyone can read by slug" on public.shared_links;
drop policy if exists "Links: owner can manage" on public.shared_links;
create policy "Links: anyone can read by slug" on public.shared_links for select using (true);
create policy "Links: owner can manage" on public.shared_links for all
  using (public.is_trip_owner(trip_id, auth.uid()));

-- ============================================
-- INDEXES
-- ============================================
create index if not exists idx_trip_members_user on public.trip_members(user_id);
create index if not exists idx_trip_members_trip on public.trip_members(trip_id);
create index if not exists idx_days_trip on public.days(trip_id);
create index if not exists idx_items_day on public.itinerary_items(day_id);
create index if not exists idx_items_trip on public.itinerary_items(trip_id);
create index if not exists idx_expenses_trip on public.expenses(trip_id);
create index if not exists idx_shared_links_slug on public.shared_links(slug);

-- ============================================
-- REAL-TIME (enable for collaborative editing)
-- ============================================
-- Go to Supabase Dashboard → Database → Replication
-- Enable real-time for: trips, days, itinerary_items, expenses, trip_members
