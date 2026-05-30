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

create table if not exists product_categories (
  category_id text primary key,
  label text not null,
  note text not null default '',
  is_tapioca_free boolean not null default false,
  has_whip_by_default boolean not null default false,
  sort_order integer not null default 9999,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists products (
  drink_id text primary key,
  name text not null,
  category_id text not null references product_categories(category_id),
  price integer not null,
  description text not null default '',
  image_url text not null default '',
  temperatures jsonb not null default '["ICE"]'::jsonb,
  is_recommended boolean not null default false,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  allowed_sizes jsonb,
  allowed_sweetness jsonb,
  allowed_ice jsonb,
  allowed_options jsonb,
  allowed_toppings jsonb,
  sort_order integer not null default 9999,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on products (category_id, sort_order);
create index if not exists products_active_idx on products (is_active);

create table if not exists menu_settings (
  setting_type text not null,
  item_id text not null,
  label text not null default '',
  price integer not null default 0,
  values_json jsonb,
  sort_order integer not null default 9999,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (setting_type, item_id)
);

create index if not exists menu_settings_type_idx on menu_settings (setting_type, sort_order);

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

create table if not exists store_menu_items (
  store_id text not null,
  setting_type text not null check (setting_type in ('option', 'topping')),
  item_id text not null,
  is_available boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (store_id, setting_type, item_id)
);

create index if not exists store_menu_items_store_idx on store_menu_items (store_id, setting_type);

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
