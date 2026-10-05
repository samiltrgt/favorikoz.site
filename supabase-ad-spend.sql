-- Manual/imported daily spend in TRY; never infer spend from orders.
begin;
create table if not exists public.ad_spend (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  source text not null check (length(source) between 1 and 100),
  campaign text not null default '' check (length(campaign) <= 200),
  amount numeric(16,2) not null check (amount >= 0),
  platform_revenue numeric(16,2) check (platform_revenue >= 0),
  unique(day, source, campaign)
);
create index if not exists ad_spend_day_idx on public.ad_spend(day);
alter table public.ad_spend enable row level security;
revoke all on public.ad_spend from anon, authenticated;
grant select, insert, update, delete on public.ad_spend to service_role;
commit;
