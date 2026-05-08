create extension if not exists "pgcrypto";

create type public.user_role as enum ('customer', 'admin');
create type public.order_status as enum ('pending', 'paid', 'packing', 'shipped', 'delivered', 'cancelled');
create type public.payment_status as enum ('pending', 'approved', 'rejected', 'refunded');
create type public.shipping_type as enum ('delivery', 'pickup');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  sku text unique,
  price numeric(12, 2) not null check (price >= 0),
  promo_price numeric(12, 2) check (promo_price is null or promo_price >= 0),
  transfer_price numeric(12, 2) check (transfer_price is null or transfer_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  public_url text,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hero_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  cta_label text,
  cta_href text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  order_number text not null unique default ('GRZ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  shipping_type public.shipping_type not null default 'delivery',
  shipping_address_json jsonb,
  notes text,
  subtotal numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  shipping_cost numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12, 2) not null default 0,
  promo_price numeric(12, 2),
  quantity integer not null check (quantity > 0),
  line_total numeric(12, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  provider text not null default 'mercadopago',
  preference_id text,
  payment_id text,
  external_reference text,
  amount numeric(12, 2) not null default 0,
  status public.payment_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_brand_id on public.products(brand_id);
create index if not exists idx_products_is_active on public.products(is_active);
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_payments_status on public.payments(status);

create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger trg_categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

create trigger trg_brands_set_updated_at
before update on public.brands
for each row
execute function public.set_updated_at();

create trigger trg_products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

create trigger trg_hero_banners_set_updated_at
before update on public.hero_banners
for each row
execute function public.set_updated_at();

create trigger trg_orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

create trigger trg_payments_set_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.hero_banners enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (auth.uid() = id or public.es_admin());

create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (auth.uid() = id or public.es_admin())
with check (auth.uid() = id or public.es_admin());

create policy "admin_manage_profiles"
on public.profiles
for all
using (public.es_admin())
with check (public.es_admin());

create policy "public_read_categories"
on public.categories
for select
using (is_active = true or public.es_admin());

create policy "public_read_brands"
on public.brands
for select
using (is_active = true or public.es_admin());

create policy "public_read_products"
on public.products
for select
using (is_active = true or public.es_admin());

create policy "public_read_product_images"
on public.product_images
for select
using (true);

create policy "public_read_hero_banners"
on public.hero_banners
for select
using (is_active = true or public.es_admin());

create policy "admin_manage_categories"
on public.categories
for all
using (public.es_admin())
with check (public.es_admin());

create policy "admin_manage_brands"
on public.brands
for all
using (public.es_admin())
with check (public.es_admin());

create policy "admin_manage_products"
on public.products
for all
using (public.es_admin())
with check (public.es_admin());

create policy "admin_manage_product_images"
on public.product_images
for all
using (public.es_admin())
with check (public.es_admin());

create policy "admin_manage_hero_banners"
on public.hero_banners
for all
using (public.es_admin())
with check (public.es_admin());

create policy "users_read_own_orders_or_admin"
on public.orders
for select
using (auth.uid() = user_id or public.es_admin());

create policy "users_insert_own_orders_or_admin"
on public.orders
for insert
with check (auth.uid() = user_id or public.es_admin());

create policy "admin_manage_orders"
on public.orders
for all
using (public.es_admin())
with check (public.es_admin());

create policy "users_read_own_order_items_or_admin"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders
    where public.orders.id = order_items.order_id
      and (public.orders.user_id = auth.uid() or public.es_admin())
  )
);

create policy "users_insert_own_order_items_or_admin"
on public.order_items
for insert
with check (
  exists (
    select 1
    from public.orders
    where public.orders.id = order_items.order_id
      and (public.orders.user_id = auth.uid() or public.es_admin())
  )
);

create policy "admin_manage_order_items"
on public.order_items
for all
using (public.es_admin())
with check (public.es_admin());

create policy "users_read_own_payments_or_admin"
on public.payments
for select
using (
  exists (
    select 1
    from public.orders
    where public.orders.id = payments.order_id
      and (public.orders.user_id = auth.uid() or public.es_admin())
  )
);

create policy "admin_manage_payments"
on public.payments
for all
using (public.es_admin())
with check (public.es_admin());

insert into storage.buckets (id, name, public)
values
  ('products', 'products', true),
  ('hero', 'hero', true),
  ('brands', 'brands', true)
on conflict (id) do nothing;

create policy "public_read_storage_assets"
on storage.objects
for select
using (bucket_id in ('products', 'hero', 'brands'));

create policy "admin_manage_storage_assets"
on storage.objects
for all
using (public.es_admin() and bucket_id in ('products', 'hero', 'brands'))
with check (public.es_admin() and bucket_id in ('products', 'hero', 'brands'));
