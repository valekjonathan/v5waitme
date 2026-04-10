-- Solicitudes de compra WaitMe entre usuarios (estado persistente + realtime).

create table if not exists public.waitme_purchase_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null,
  seller_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  price numeric default 0,
  alert_snapshot jsonb,
  thread_id uuid,
  seller_latitude double precision,
  seller_longitude double precision,
  accepted_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id)
);

create index if not exists waitme_purchase_buyer_idx on public.waitme_purchase_requests (buyer_id, status, created_at desc);
create index if not exists waitme_purchase_seller_idx on public.waitme_purchase_requests (seller_id, status, created_at desc);

alter table public.waitme_purchase_requests enable row level security;

drop policy if exists "waitme_purchase_select" on public.waitme_purchase_requests;
create policy "waitme_purchase_select"
  on public.waitme_purchase_requests for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists "waitme_purchase_insert_buyer" on public.waitme_purchase_requests;
create policy "waitme_purchase_insert_buyer"
  on public.waitme_purchase_requests for insert
  with check (auth.uid() = buyer_id);

drop policy if exists "waitme_purchase_update_parties" on public.waitme_purchase_requests;
create policy "waitme_purchase_update_parties"
  on public.waitme_purchase_requests for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id)
  with check (auth.uid() = buyer_id or auth.uid() = seller_id);

create or replace function public.waitme_touch_purchase_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists waitme_purchase_touch_updated on public.waitme_purchase_requests;
create trigger waitme_purchase_touch_updated
  before update on public.waitme_purchase_requests
  for each row execute function public.waitme_touch_purchase_updated_at();

do $$
begin
  alter publication supabase_realtime add table public.waitme_purchase_requests;
exception
  when duplicate_object then null;
end $$;
