create table if not exists orders (
  order_id text primary key,
  pickup_code text not null,
  store_id text not null,
  store_name text not null,
  status text not null,
  payment_status text not null,
  square_order_id text unique,
  square_payment_id text,
  square_receipt_url text,
  square_payment_updated_at timestamptz,
  drink text not null,
  size text not null,
  temperature text not null,
  sweetness text not null,
  ice text not null,
  option_label text not null,
  toppings_label text not null,
  pickup_date text not null,
  pickup_time text not null,
  amount integer not null,
  currency text not null default 'JPY',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists orders_pickup_idx on orders (pickup_date, pickup_time);
create index if not exists orders_status_idx on orders (status, payment_status);

create table if not exists store_products (
  store_id text not null,
  drink_id text not null,
  is_available boolean not null default true,
  website_enabled boolean not null default true,
  price_override integer,
  updated_at timestamptz not null default now(),
  primary key (store_id, drink_id)
);

create index if not exists store_products_store_idx on store_products (store_id);

create table if not exists store_operations (
  store_id text primary key,
  reservations_enabled boolean not null default true,
  status_note text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists admin_users (
  user_id text primary key,
  login_id text not null unique,
  display_name text not null,
  role text not null check (role in ('owner', 'manager', 'staff')),
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_user_stores (
  user_id text not null references admin_users(user_id) on delete cascade,
  store_id text not null,
  primary key (user_id, store_id)
);

create index if not exists admin_user_stores_store_idx on admin_user_stores (store_id);
