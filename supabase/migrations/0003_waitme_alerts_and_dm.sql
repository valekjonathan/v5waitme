-- Alertas / historial de aparcamiento y mensajes directos (WaitMe v5).
-- Aplicar en el proyecto Supabase vinculado: supabase db push (o SQL editor).

-- ---------------------------------------------------------------------------
-- Alertas y reservas (historial del usuario)
-- ---------------------------------------------------------------------------
create table if not exists public.waitme_parking_alerts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  listing_type text not null default 'parking_alert'
    check (listing_type in ('parking_alert', 'reservation')),
  status text not null check (status in ('active', 'completed')),
  peer_display_name text,
  peer_rating numeric default 4,
  brand text,
  model text,
  plate text,
  price numeric default 0,
  latitude double precision,
  longitude double precision,
  address text,
  available_in_minutes int,
  wait_until timestamptz,
  user_photo text,
  vehicle_color text,
  vehicle_type text default 'car',
  phone text,
  allow_phone_calls boolean default false,
  is_incoming_request boolean default false,
  peer_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists waitme_parking_alerts_owner_listing_idx
  on public.waitme_parking_alerts (owner_id, listing_type, status);

alter table public.waitme_parking_alerts enable row level security;

drop policy if exists "waitme_alerts_select_own" on public.waitme_parking_alerts;
create policy "waitme_alerts_select_own"
  on public.waitme_parking_alerts for select
  using (auth.uid() = owner_id);

drop policy if exists "waitme_alerts_insert_own" on public.waitme_parking_alerts;
create policy "waitme_alerts_insert_own"
  on public.waitme_parking_alerts for insert
  with check (auth.uid() = owner_id);

drop policy if exists "waitme_alerts_update_own" on public.waitme_parking_alerts;
create policy "waitme_alerts_update_own"
  on public.waitme_parking_alerts for update
  using (auth.uid() = owner_id);

drop policy if exists "waitme_alerts_delete_own" on public.waitme_parking_alerts;
create policy "waitme_alerts_delete_own"
  on public.waitme_parking_alerts for delete
  using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- Hilos DM (dos usuarios por hilo; par único)
-- ---------------------------------------------------------------------------
create table if not exists public.waitme_dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (user_a <> user_b)
);

create unique index if not exists waitme_dm_threads_pair_uidx
  on public.waitme_dm_threads (least(user_a, user_b), greatest(user_a, user_b));

alter table public.waitme_dm_threads enable row level security;

drop policy if exists "waitme_dm_threads_select_member" on public.waitme_dm_threads;
create policy "waitme_dm_threads_select_member"
  on public.waitme_dm_threads for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Sin política INSERT: RLS deniega inserción directa; solo la RPC security definer crea hilos.

-- ---------------------------------------------------------------------------
-- Mensajes
-- ---------------------------------------------------------------------------
create table if not exists public.waitme_dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.waitme_dm_threads (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz default now(),
  check (char_length(trim(body)) > 0 and char_length(body) <= 2000)
);

create index if not exists waitme_dm_messages_thread_created_idx
  on public.waitme_dm_messages (thread_id, created_at desc);

alter table public.waitme_dm_messages enable row level security;

drop policy if exists "waitme_dm_messages_select_member" on public.waitme_dm_messages;
create policy "waitme_dm_messages_select_member"
  on public.waitme_dm_messages for select
  using (
    exists (
      select 1 from public.waitme_dm_threads t
      where t.id = thread_id
        and (t.user_a = auth.uid() or t.user_b = auth.uid())
    )
  );

drop policy if exists "waitme_dm_messages_insert_member" on public.waitme_dm_messages;
create policy "waitme_dm_messages_insert_member"
  on public.waitme_dm_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.waitme_dm_threads t
      where t.id = thread_id
        and (t.user_a = auth.uid() or t.user_b = auth.uid())
    )
  );

-- Realtime (si la publicación existe en el proyecto)
do $$
begin
  alter publication supabase_realtime add table public.waitme_dm_messages;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- RPC: obtener o crear hilo entre dos usuarios
-- ---------------------------------------------------------------------------
create or replace function public.waitme_get_or_create_dm_thread(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  tid uuid;
  ua uuid;
  ub uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if other_user_id is null or other_user_id = me then
    raise exception 'invalid peer';
  end if;

  ua := least(me, other_user_id);
  ub := greatest(me, other_user_id);

  select t.id into tid
  from public.waitme_dm_threads t
  where least(t.user_a, t.user_b) = ua
    and greatest(t.user_a, t.user_b) = ub
  limit 1;

  if tid is not null then
    return tid;
  end if;

  insert into public.waitme_dm_threads (user_a, user_b)
  values (ua, ub)
  returning id into tid;

  return tid;
end;
$$;

revoke all on function public.waitme_get_or_create_dm_thread(uuid) from public;
grant execute on function public.waitme_get_or_create_dm_thread(uuid) to authenticated;

-- Mantener updated_at del hilo al escribir mensajes
create or replace function public.waitme_touch_dm_thread_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.waitme_dm_threads
  set updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists waitme_dm_messages_touch_thread on public.waitme_dm_messages;
create trigger waitme_dm_messages_touch_thread
  after insert on public.waitme_dm_messages
  for each row execute procedure public.waitme_touch_dm_thread_updated_at();
