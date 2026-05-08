create type public.address_kind as enum ('home', 'work', 'other');
create type public.stock_movement_type as enum ('in', 'out', 'adjustment', 'reservation', 'release');
create type public.shipment_status as enum (
  'pending',
  'quoted',
  'ready_for_dispatch',
  'in_transit',
  'delivered',
  'returned',
  'cancelled'
);
create type public.shipping_method as enum ('pickup', 'local_delivery', 'paq_ar', 'custom');
create type public.coupon_type as enum ('percentage', 'fixed');
create type public.coupon_scope as enum ('order', 'shipping');
create type public.faq_status as enum ('draft', 'published', 'archived');
create type public.email_status as enum ('pending', 'sent', 'failed');

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind public.address_kind not null default 'home',
  label text,
  recipient_name text,
  phone text,
  street text not null,
  street_number text not null,
  floor text,
  apartment text,
  city text not null,
  province text not null,
  postal_code text not null,
  country text not null default 'AR',
  reference text,
  is_default_shipping boolean not null default false,
  is_default_billing boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  address text not null,
  city text not null,
  province text not null,
  postal_code text,
  phone text,
  whatsapp text,
  email text,
  opening_hours jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  province text,
  city text,
  postal_code_from text,
  postal_code_to text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.shipping_rules (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid references public.shipping_zones(id) on delete set null,
  method public.shipping_method not null default 'local_delivery',
  name text not null,
  min_order_total numeric(12, 2) not null default 0,
  max_weight_grams integer,
  price numeric(12, 2) not null default 0,
  free_from_amount numeric(12, 2),
  estimated_days_min integer,
  estimated_days_max integer,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text unique,
  attributes jsonb not null default '{}'::jsonb,
  stock integer not null default 0 check (stock >= 0),
  price_override numeric(12, 2) check (price_override is null or price_override >= 0),
  promo_price_override numeric(12, 2) check (promo_price_override is null or promo_price_override >= 0),
  image_url text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.orders
  add column if not exists address_id uuid references public.addresses(id) on delete set null,
  add column if not exists branch_id uuid references public.branches(id) on delete set null,
  add column if not exists internal_note text,
  add column if not exists source text not null default 'web';

alter table public.order_items
  add column if not exists variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists variant_name text;

alter table public.payments
  add column if not exists payment_method text,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz;

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  shipping_rule_id uuid references public.shipping_rules(id) on delete set null,
  zone_id uuid references public.shipping_zones(id) on delete set null,
  status public.shipment_status not null default 'pending',
  courier_name text,
  service_name text,
  tracking_number text,
  tracking_url text,
  quoted_price numeric(12, 2),
  final_price numeric(12, 2),
  label_url text,
  metadata jsonb not null default '{}'::jsonb,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  previous_status public.order_status,
  new_status public.order_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  changed_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  movement_type public.stock_movement_type not null,
  quantity integer not null check (quantity <> 0),
  reason text not null,
  order_id uuid references public.orders(id) on delete set null,
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint stock_movements_requires_target check (product_id is not null or variant_id is not null)
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  coupon_type public.coupon_type not null,
  coupon_scope public.coupon_scope not null default 'order',
  discount_value numeric(12, 2) not null check (discount_value >= 0),
  min_order_total numeric(12, 2) not null default 0,
  max_discount_amount numeric(12, 2),
  usage_limit integer,
  per_user_limit integer,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.coupon_usages (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  code_snapshot text not null,
  discount_amount numeric(12, 2) not null default 0,
  used_at timestamptz not null default timezone('utc', now()),
  constraint coupon_usages_coupon_order_unique unique (coupon_id, order_id)
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  sort_order integer not null default 0,
  status public.faq_status not null default 'draft',
  is_featured boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  template_key text not null,
  provider text not null default 'resend',
  to_email text not null,
  subject text not null,
  status public.email_status not null default 'pending',
  provider_message_id text,
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_addresses_set_updated_at
before update on public.addresses
for each row
execute function public.set_updated_at();

create trigger trg_branches_set_updated_at
before update on public.branches
for each row
execute function public.set_updated_at();

create trigger trg_shipping_zones_set_updated_at
before update on public.shipping_zones
for each row
execute function public.set_updated_at();

create trigger trg_shipping_rules_set_updated_at
before update on public.shipping_rules
for each row
execute function public.set_updated_at();

create trigger trg_product_variants_set_updated_at
before update on public.product_variants
for each row
execute function public.set_updated_at();

create trigger trg_shipments_set_updated_at
before update on public.shipments
for each row
execute function public.set_updated_at();

create trigger trg_coupons_set_updated_at
before update on public.coupons
for each row
execute function public.set_updated_at();

create trigger trg_faqs_set_updated_at
before update on public.faqs
for each row
execute function public.set_updated_at();

create trigger trg_email_logs_set_updated_at
before update on public.email_logs
for each row
execute function public.set_updated_at();

create or replace function public.order_belongs_to_current_user(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders
    where id = p_order_id
      and user_id = auth.uid()
  );
$$;

alter table public.addresses enable row level security;
alter table public.branches enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.shipping_rules enable row level security;
alter table public.product_variants enable row level security;
alter table public.shipments enable row level security;
alter table public.order_status_history enable row level security;
alter table public.stock_movements enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_usages enable row level security;
alter table public.faqs enable row level security;
alter table public.email_logs enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.system_settings enable row level security;

create policy "users_manage_own_addresses"
on public.addresses
for all
using (auth.uid() = user_id or public.es_admin())
with check (auth.uid() = user_id or public.es_admin());

create policy "public_read_active_branches"
on public.branches
for select
using (is_active = true or public.es_admin());

create policy "admin_manage_branches"
on public.branches
for all
using (public.es_admin())
with check (public.es_admin());

create policy "public_read_shipping_zones"
on public.shipping_zones
for select
using (is_active = true or public.es_admin());

create policy "admin_manage_shipping_zones"
on public.shipping_zones
for all
using (public.es_admin())
with check (public.es_admin());

create policy "public_read_shipping_rules"
on public.shipping_rules
for select
using (is_active = true or public.es_admin());

create policy "admin_manage_shipping_rules"
on public.shipping_rules
for all
using (public.es_admin())
with check (public.es_admin());

create policy "public_read_product_variants"
on public.product_variants
for select
using (is_active = true or public.es_admin());

create policy "admin_manage_product_variants"
on public.product_variants
for all
using (public.es_admin())
with check (public.es_admin());

create policy "users_read_own_shipments_or_admin"
on public.shipments
for select
using (public.order_belongs_to_current_user(order_id) or public.es_admin());

create policy "admin_manage_shipments"
on public.shipments
for all
using (public.es_admin())
with check (public.es_admin());

create policy "users_read_own_order_status_history_or_admin"
on public.order_status_history
for select
using (public.order_belongs_to_current_user(order_id) or public.es_admin());

create policy "admin_manage_order_status_history"
on public.order_status_history
for all
using (public.es_admin())
with check (public.es_admin());

create policy "admin_manage_stock_movements"
on public.stock_movements
for all
using (public.es_admin())
with check (public.es_admin());

create policy "admin_manage_coupons"
on public.coupons
for all
using (public.es_admin())
with check (public.es_admin());

create policy "users_read_own_coupon_usages_or_admin"
on public.coupon_usages
for select
using (
  user_id = auth.uid()
  or public.order_belongs_to_current_user(order_id)
  or public.es_admin()
);

create policy "admin_manage_coupon_usages"
on public.coupon_usages
for all
using (public.es_admin())
with check (public.es_admin());

create policy "public_read_published_faqs"
on public.faqs
for select
using (status = 'published' or public.es_admin());

create policy "admin_manage_faqs"
on public.faqs
for all
using (public.es_admin())
with check (public.es_admin());

create policy "admin_manage_email_logs"
on public.email_logs
for all
using (public.es_admin())
with check (public.es_admin());

create policy "admin_manage_audit_logs"
on public.admin_audit_logs
for all
using (public.es_admin())
with check (public.es_admin());

create policy "public_read_public_settings"
on public.system_settings
for select
using (is_public = true or public.es_admin());

create policy "admin_manage_system_settings"
on public.system_settings
for all
using (public.es_admin())
with check (public.es_admin());

create index if not exists idx_addresses_user_id on public.addresses(user_id);
create index if not exists idx_branches_is_active on public.branches(is_active);
create index if not exists idx_shipping_zones_is_active on public.shipping_zones(is_active);
create index if not exists idx_shipping_rules_zone_id on public.shipping_rules(zone_id);
create index if not exists idx_shipping_rules_is_active on public.shipping_rules(is_active);
create index if not exists idx_product_variants_product_id on public.product_variants(product_id);
create index if not exists idx_product_variants_is_active on public.product_variants(is_active);
create index if not exists idx_shipments_order_id on public.shipments(order_id);
create index if not exists idx_shipments_status on public.shipments(status);
create index if not exists idx_order_status_history_order_id on public.order_status_history(order_id);
create index if not exists idx_stock_movements_product_id on public.stock_movements(product_id);
create index if not exists idx_stock_movements_variant_id on public.stock_movements(variant_id);
create index if not exists idx_stock_movements_order_id on public.stock_movements(order_id);
create index if not exists idx_coupons_code on public.coupons(code);
create index if not exists idx_coupons_is_active on public.coupons(is_active);
create index if not exists idx_coupon_usages_coupon_id on public.coupon_usages(coupon_id);
create index if not exists idx_coupon_usages_order_id on public.coupon_usages(order_id);
create index if not exists idx_faqs_status on public.faqs(status);
create index if not exists idx_email_logs_order_id on public.email_logs(order_id);
create index if not exists idx_email_logs_status on public.email_logs(status);
create index if not exists idx_admin_audit_logs_actor_id on public.admin_audit_logs(actor_id);

insert into public.system_settings (key, value, description, is_public)
values
  ('store.currency', '{"code":"ARS","symbol":"$"}'::jsonb, 'Configuración monetaria principal de la tienda.', true),
  ('store.checkout', '{"allow_guest_checkout":true,"allow_pickup":true}'::jsonb, 'Reglas base del checkout.', false),
  ('store.seo', '{"site_name":"Grizzly Suplementos"}'::jsonb, 'Datos SEO globales del sitio.', true)
on conflict (key) do nothing;
