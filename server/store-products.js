const publishedMenu = require("../published/menu.json");
const { getHomepageData } = require("./homepage-source");
const { getProductCatalogMenu } = require("./product-catalog");

let sqlClientPromise;

const getSql = async () => {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!sqlClientPromise) {
    sqlClientPromise = import("@neondatabase/serverless").then(({ neon }) => neon(process.env.DATABASE_URL));
  }

  return sqlClientPromise;
};

const getBaseMenu = () => getProductCatalogMenu();

const getPublishedStoreMenu = (storeId) => publishedMenu.storeMenus?.[storeId];

const ensureStoreMenuItemsTable = async (sql) => {
  await sql`
    create table if not exists store_menu_items (
      store_id text not null,
      setting_type text not null check (setting_type in ('option', 'topping')),
      item_id text not null,
      is_available boolean not null default true,
      updated_at timestamptz not null default now(),
      primary key (store_id, setting_type, item_id)
    )
  `;
  await sql`
    create index if not exists store_menu_items_store_idx
    on store_menu_items (store_id, setting_type)
  `;
};

const defaultAvailabilityByDrinkId = async (storeId) => {
  const baseMenu = await getBaseMenu();
  const storeMenu = getPublishedStoreMenu(storeId);
  const sourceDrinks = storeMenu?.drinks?.length ? storeMenu.drinks : baseMenu.drinks;
  return new Map(
    sourceDrinks.map((drink) => [
      drink.id,
      {
        drinkId: drink.id,
        isAvailable: drink.isAvailable !== false,
        websiteEnabled: drink.websiteEnabled !== false,
        priceOverride: Number.isFinite(Number(drink.price)) && drink.price !== baseMenu.drinks.find((item) => item.id === drink.id)?.price
          ? Number(drink.price)
          : null,
      },
    ]),
  );
};

const listStoreProducts = async (storeId) => {
  const baseMenu = await getBaseMenu();
  const defaults = await defaultAvailabilityByDrinkId(storeId);
  const sql = await getSql();
  const overrides = sql
    ? await sql`
        select *
        from store_products
        where store_id = ${storeId}
      `
    : [];
  const overrideMap = new Map(overrides.map((row) => [row.drink_id, row]));

  return baseMenu.drinks.map((drink) => {
    const fallback = defaults.get(drink.id) || {
      isAvailable: false,
      websiteEnabled: false,
      priceOverride: null,
    };
    const override = overrideMap.get(drink.id);

    return {
      drinkId: drink.id,
      name: drink.name,
      category: drink.category,
      categoryLabel: baseMenu.categories.find((category) => category.id === drink.category)?.label || drink.category,
      basePrice: drink.price,
      imageUrl: drink.imageUrl,
      isAvailable: override ? override.is_available : fallback.isAvailable,
      websiteEnabled: override ? override.website_enabled : fallback.websiteEnabled,
      priceOverride: override?.price_override ?? fallback.priceOverride,
      effectivePrice: override?.price_override ?? fallback.priceOverride ?? drink.price,
      updatedAt: override?.updated_at || "",
    };
  });
};

const listStoreMenuItems = async (storeId, menuSettings = {}) => {
  const sql = await getSql();
  if (sql) {
    await ensureStoreMenuItemsTable(sql);
  }
  const overrides = sql
    ? await sql`
        select *
        from store_menu_items
        where store_id = ${storeId}
      `
    : [];
  const overrideMap = new Map(overrides.map((row) => [`${row.setting_type}/${row.item_id}`, row]));
  const toStoreItem = (type, item) => {
    const override = overrideMap.get(`${type}/${item.id}`);
    return {
      type,
      id: item.id,
      label: item.label,
      price: Number(item.price) || 0,
      isAvailable: item.id === "none" ? true : override ? override.is_available : true,
      updatedAt: override?.updated_at || "",
    };
  };

  return [
    ...(menuSettings.options || []).map((item) => toStoreItem("option", item)),
    ...(menuSettings.toppings || []).map((item) => toStoreItem("topping", item)),
  ];
};

const applyStoreProductAvailability = async (menu, storeId) => {
  if (!storeId) return menu;

  const [products, storeMenuItems] = await Promise.all([
    listStoreProducts(storeId),
    listStoreMenuItems(storeId, menu),
  ]);
  const byDrinkId = new Map(products.map((product) => [product.drinkId, product]));
  const availableItemKeys = new Set(
    storeMenuItems
      .filter((item) => item.isAvailable)
      .map((item) => `${item.type}/${item.id}`),
  );

  return {
    ...menu,
    selectedStoreId: storeId,
    options: menu.options.filter((item) => item.id === "none" || availableItemKeys.has(`option/${item.id}`)),
    toppings: menu.toppings.filter((item) => availableItemKeys.has(`topping/${item.id}`)),
    drinks: menu.drinks
      .map((drink) => {
        const product = byDrinkId.get(drink.id);
        return {
          ...drink,
          price: product?.effectivePrice ?? drink.price,
          isAvailable: product?.isAvailable ?? false,
          websiteEnabled: product?.websiteEnabled ?? false,
        };
      })
      .filter((drink) => drink.isAvailable && drink.websiteEnabled),
  };
};

const updateStoreProduct = async (storeId, drinkId, fields) => {
  const sql = await getSql();
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const baseMenu = await getBaseMenu();
  const drink = baseMenu.drinks.find((item) => item.id === drinkId);
  if (!drink) {
    return null;
  }

  const defaults = (await defaultAvailabilityByDrinkId(storeId)).get(drinkId) || {
    isAvailable: false,
    websiteEnabled: false,
    priceOverride: null,
  };
  const isAvailable = fields.isAvailable ?? defaults.isAvailable;
  const websiteEnabled = fields.websiteEnabled ?? defaults.websiteEnabled;
  const priceOverride =
    fields.priceOverride === null || fields.priceOverride === ""
      ? null
      : fields.priceOverride === undefined
        ? defaults.priceOverride
        : Number(fields.priceOverride);

  await sql`
    insert into store_products (
      store_id,
      drink_id,
      is_available,
      website_enabled,
      price_override
    ) values (
      ${storeId},
      ${drinkId},
      ${isAvailable},
      ${websiteEnabled},
      ${Number.isFinite(priceOverride) ? priceOverride : null}
    )
    on conflict (store_id, drink_id)
    do update set
      is_available = excluded.is_available,
      website_enabled = excluded.website_enabled,
      price_override = excluded.price_override,
      updated_at = now()
  `;

  const rows = await sql`
    select *
    from store_products
    where store_id = ${storeId}
      and drink_id = ${drinkId}
    limit 1
  `;
  const override = rows[0];

  return {
    drinkId: drink.id,
    name: drink.name,
    category: drink.category,
    categoryLabel: baseMenu.categories.find((category) => category.id === drink.category)?.label || drink.category,
    basePrice: drink.price,
    imageUrl: drink.imageUrl,
    isAvailable: override ? override.is_available : isAvailable,
    websiteEnabled: override ? override.website_enabled : websiteEnabled,
    priceOverride: override?.price_override ?? (Number.isFinite(priceOverride) ? priceOverride : null),
    effectivePrice: override?.price_override ?? (Number.isFinite(priceOverride) ? priceOverride : null) ?? drink.price,
    updatedAt: override?.updated_at || "",
  };
};

const updateStoreMenuItem = async (storeId, type, itemId, fields) => {
  if (!["option", "topping"].includes(type)) {
    return null;
  }
  const sql = await getSql();
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }
  await ensureStoreMenuItemsTable(sql);

  const baseMenu = await getBaseMenu();
  const items = type === "option" ? baseMenu.options : baseMenu.toppings;
  const item = items.find((entry) => entry.id === itemId);
  if (!item) {
    return null;
  }
  const isAvailable = item.id === "none" ? true : fields.isAvailable !== false;

  await sql`
    insert into store_menu_items (
      store_id,
      setting_type,
      item_id,
      is_available
    ) values (
      ${storeId},
      ${type},
      ${itemId},
      ${isAvailable}
    )
    on conflict (store_id, setting_type, item_id)
    do update set
      is_available = excluded.is_available,
      updated_at = now()
  `;

  const rows = await sql`
    select *
    from store_menu_items
    where store_id = ${storeId}
      and setting_type = ${type}
      and item_id = ${itemId}
    limit 1
  `;
  const override = rows[0];

  return {
    type,
    id: item.id,
    label: item.label,
    price: Number(item.price) || 0,
    isAvailable: item.id === "none" ? true : override ? override.is_available : isAvailable,
    updatedAt: override?.updated_at || "",
  };
};

const listActiveStores = async () =>
  (await getHomepageData()).stores
    .filter((store) => store.address)
    .map((store) => ({
      id: store.id,
      name: store.name,
      isPrimary: store.isPrimary,
    }));

module.exports = {
  listActiveStores,
  listStoreMenuItems,
  listStoreProducts,
  applyStoreProductAvailability,
  updateStoreMenuItem,
  updateStoreProduct,
};
