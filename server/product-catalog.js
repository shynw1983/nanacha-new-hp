const publishedMenu = require("../published/menu.json");
const localCategoryNotes = require("../data/category-notes.js");
const localDrinkDescriptions = require("../data/menu-descriptions.js");

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

const basePublishedMenu = publishedMenu.baseMenu;

const asArray = (value) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const optionalArray = (value) => {
  const normalized = asArray(value);
  return normalized.length ? normalized : null;
};

const jsonParam = (value) => (Array.isArray(value) ? JSON.stringify(value) : value === null ? null : undefined);
const settingTypes = new Set(["size", "sweetness", "ice", "hotIce", "option", "topping"]);

const fallbackMenu = () => ({
  ...basePublishedMenu,
  categories: basePublishedMenu.categories.map((category) => ({
    ...category,
    note: category.note || localCategoryNotes[category.id] || "",
  })),
  drinks: basePublishedMenu.drinks.map((drink) => ({
    ...drink,
    description: drink.description || localDrinkDescriptions[drink.name] || "",
    isActive: drink.isActive !== false,
  })),
});

const toCategory = (row) => ({
  id: row.category_id,
  label: row.label,
  note: row.note || "",
  isTapiocaFree: row.is_tapioca_free,
  hasWhipByDefault: row.has_whip_by_default,
  sortOrder: row.sort_order,
  isActive: row.is_active,
});

const toDrink = (row) => ({
  id: row.drink_id,
  name: row.name,
  category: row.category_id,
  price: Number(row.price),
  description: row.description || "",
  imageUrl: row.image_url || "",
  temperatures: asArray(row.temperatures).length ? asArray(row.temperatures) : ["ICE"],
  isRecommended: row.is_recommended,
  isFeatured: row.is_featured,
  isActive: row.is_active,
  allowedSizes: optionalArray(row.allowed_sizes) || undefined,
  allowedSweetness: optionalArray(row.allowed_sweetness) || undefined,
  allowedIce: optionalArray(row.allowed_ice) || undefined,
  allowedOptions: optionalArray(row.allowed_options) || undefined,
  allowedToppings: optionalArray(row.allowed_toppings) || undefined,
  sortOrder: row.sort_order,
  updatedAt: row.updated_at || "",
});

const defaultMenuSettings = () => ({
  sizes: basePublishedMenu.sizes,
  sweetness: basePublishedMenu.sweetness,
  ice: basePublishedMenu.ice,
  hotIce: basePublishedMenu.hotIce,
  options: basePublishedMenu.options,
  toppings: basePublishedMenu.toppings,
  temperatures: ["ICE", "HOT"],
});

const toMenuSetting = (row) => ({
  type: row.setting_type,
  id: row.item_id,
  label: row.label || row.item_id,
  price: Number(row.price) || 0,
  values: asArray(row.values_json),
  sortOrder: row.sort_order,
  isActive: row.is_active,
});

const buildMenuSettings = (rows = []) => {
  const activeRows = rows.map(toMenuSetting).filter((item) => item.isActive);
  const byType = (type) => activeRows.filter((item) => item.type === type);
  const singleValues = (type) => byType(type)[0]?.values || [];
  const hotIce = byType("hotIce")[0]?.label || singleValues("hotIce")[0] || basePublishedMenu.hotIce;

  return {
    sizes: byType("size").map(({ id, label, price }) => ({ id, label, price })),
    sweetness: singleValues("sweetness"),
    ice: singleValues("ice"),
    hotIce,
    options: byType("option").map(({ id, label, price }) => ({ id, label, price })),
    toppings: byType("topping").map(({ id, label, price }) => ({ id, label, price })),
    temperatures: ["ICE", "HOT"],
  };
};

const normalizeMenuSettings = (settings = defaultMenuSettings()) => ({
  ...settings,
  sizes: settings.sizes?.length ? settings.sizes : basePublishedMenu.sizes,
  sweetness: settings.sweetness?.length ? settings.sweetness : basePublishedMenu.sweetness,
  ice: settings.ice?.length ? settings.ice : basePublishedMenu.ice,
  hotIce: settings.hotIce || basePublishedMenu.hotIce,
  options: settings.options?.length ? settings.options : basePublishedMenu.options,
  toppings: settings.toppings?.length ? settings.toppings : basePublishedMenu.toppings,
  temperatures: settings.temperatures?.length ? settings.temperatures : ["ICE", "HOT"],
});

const publicMenuFromRows = (categoryRows, productRows, settings = defaultMenuSettings()) => {
  const categories = categoryRows.map(toCategory).filter((category) => category.isActive);
  const activeCategoryIds = new Set(categories.map((category) => category.id));
  const drinks = productRows
    .map(toDrink)
    .filter((drink) => drink.isActive && activeCategoryIds.has(drink.category))
    .map(({ sortOrder, isActive, updatedAt, ...drink }) => drink);

  return {
    ...basePublishedMenu,
    ...normalizeMenuSettings(settings),
    categories: categories.map(({ sortOrder, isActive, ...category }) => category),
    drinks,
    tapiocaFreeCategories: categories.filter((category) => category.isTapiocaFree).map((category) => category.id),
    whippedCategories: categories.filter((category) => category.hasWhipByDefault).map((category) => category.id),
  };
};

const readCatalogRows = async (sql) => {
  const [categories, products, settings] = await Promise.all([
    sql`
      select *
      from product_categories
      order by sort_order asc, label asc
    `,
    sql`
      select *
      from products
      order by sort_order asc, name asc
    `,
    sql`
      select *
      from menu_settings
      order by setting_type asc, sort_order asc, label asc
    `,
  ]);

  return { categories, products, settings };
};

const hasCatalogTables = async (sql) => {
  const rows = await sql`
    select
      to_regclass('public.product_categories') is not null as has_categories,
      to_regclass('public.products') is not null as has_products,
      to_regclass('public.menu_settings') is not null as has_settings
  `;
  return rows[0]?.has_categories && rows[0]?.has_products && rows[0]?.has_settings;
};

const ensureCatalogSeeded = async (sql) => {
  const settingRows = await sql`select count(*)::int as count from menu_settings`;
  if (Number(settingRows[0]?.count || 0) === 0) {
    const menu = fallbackMenu();
    for (const [index, item] of menu.sizes.entries()) {
      await sql`
        insert into menu_settings (setting_type, item_id, label, price, sort_order, is_active)
        values ('size', ${item.id}, ${item.label}, ${Number(item.price) || 0}, ${index + 1}, true)
        on conflict (setting_type, item_id) do nothing
      `;
    }
    for (const [index, item] of menu.options.entries()) {
      await sql`
        insert into menu_settings (setting_type, item_id, label, price, sort_order, is_active)
        values ('option', ${item.id}, ${item.label}, ${Number(item.price) || 0}, ${index + 1}, true)
        on conflict (setting_type, item_id) do nothing
      `;
    }
    for (const [index, item] of menu.toppings.entries()) {
      await sql`
        insert into menu_settings (setting_type, item_id, label, price, sort_order, is_active)
        values ('topping', ${item.id}, ${item.label}, ${Number(item.price) || 0}, ${index + 1}, true)
        on conflict (setting_type, item_id) do nothing
      `;
    }
    await sql`
      insert into menu_settings (setting_type, item_id, label, values_json, sort_order, is_active)
      values ('sweetness', 'default', '甘さ', ${JSON.stringify(menu.sweetness)}, 1, true)
      on conflict (setting_type, item_id) do nothing
    `;
    await sql`
      insert into menu_settings (setting_type, item_id, label, values_json, sort_order, is_active)
      values ('ice', 'default', '氷', ${JSON.stringify(menu.ice)}, 1, true)
      on conflict (setting_type, item_id) do nothing
    `;
    await sql`
      insert into menu_settings (setting_type, item_id, label, sort_order, is_active)
      values ('hotIce', 'default', ${menu.hotIce}, 1, true)
      on conflict (setting_type, item_id) do nothing
    `;
  }

  const rows = await sql`select count(*)::int as count from product_categories`;
  if (Number(rows[0]?.count || 0) > 0) {
    return;
  }

  const menu = fallbackMenu();
  for (const [index, category] of menu.categories.entries()) {
    await sql`
      insert into product_categories (
        category_id,
        label,
        note,
        is_tapioca_free,
        has_whip_by_default,
        sort_order,
        is_active
      ) values (
        ${category.id},
        ${category.label},
        ${category.note || ""},
        ${menu.tapiocaFreeCategories.includes(category.id) || category.isTapiocaFree === true},
        ${menu.whippedCategories.includes(category.id) || category.hasWhipByDefault === true},
        ${index + 1},
        ${category.isActive !== false}
      )
      on conflict (category_id) do nothing
    `;
  }

  for (const [index, drink] of menu.drinks.entries()) {
    await sql`
      insert into products (
        drink_id,
        name,
        category_id,
        price,
        description,
        image_url,
        temperatures,
        is_recommended,
        is_featured,
        is_active,
        allowed_sizes,
        allowed_sweetness,
        allowed_ice,
        allowed_options,
        allowed_toppings,
        sort_order
      ) values (
        ${drink.id || `drink-${index + 1}`},
        ${drink.name},
        ${drink.category},
        ${Number(drink.price) || 0},
        ${drink.description || ""},
        ${drink.imageUrl || ""},
        ${JSON.stringify(asArray(drink.temperatures).length ? asArray(drink.temperatures) : ["ICE"])},
        ${drink.isRecommended === true},
        ${drink.isFeatured === true},
        ${drink.isActive !== false},
        ${jsonParam(optionalArray(drink.allowedSizes))},
        ${jsonParam(optionalArray(drink.allowedSweetness))},
        ${jsonParam(optionalArray(drink.allowedIce))},
        ${jsonParam(optionalArray(drink.allowedOptions))},
        ${jsonParam(optionalArray(drink.allowedToppings))},
        ${index + 1}
      )
      on conflict (drink_id) do nothing
    `;
  }
};

const getProductCatalogMenu = async () => {
  const sql = await getSql();
  if (!sql) return fallbackMenu();

  try {
    if (!(await hasCatalogTables(sql))) {
      return fallbackMenu();
    }
    await ensureCatalogSeeded(sql);
    const rows = await readCatalogRows(sql);
    if (!rows.categories.length || !rows.products.length) {
      return fallbackMenu();
    }
    return publicMenuFromRows(rows.categories, rows.products, buildMenuSettings(rows.settings));
  } catch (error) {
    console.error(error);
    return fallbackMenu();
  }
};

const listProductCatalogForAdmin = async () => {
  const menuSettings = defaultMenuSettings();
  const readOnlyFallback = () => {
    const menu = fallbackMenu();
    return {
      categories: menu.categories.map((category, index) => ({
        ...category,
        sortOrder: index + 1,
        isActive: category.isActive !== false,
      })),
      products: menu.drinks.map((drink, index) => ({
        ...drink,
        drinkId: drink.id,
        categoryLabel: menu.categories.find((category) => category.id === drink.category)?.label || drink.category,
        sortOrder: index + 1,
        isActive: drink.isActive !== false,
      })),
      isEditable: false,
      menuSettings,
      settingItems: [],
    };
  };

  const sql = await getSql();
  if (!sql) {
    return readOnlyFallback();
  }

  try {
    if (!(await hasCatalogTables(sql))) {
      return readOnlyFallback();
    }
    await ensureCatalogSeeded(sql);
    const rows = await readCatalogRows(sql);
    const categoryMap = new Map(rows.categories.map((row) => [row.category_id, row.label]));
    const databaseMenuSettings = normalizeMenuSettings(buildMenuSettings(rows.settings));
    return {
      categories: rows.categories.map(toCategory),
      products: rows.products.map((row) => ({
        ...toDrink(row),
        drinkId: row.drink_id,
        categoryLabel: categoryMap.get(row.category_id) || row.category_id,
      })),
      isEditable: true,
      menuSettings: databaseMenuSettings,
      settingItems: rows.settings.map(toMenuSetting),
    };
  } catch (error) {
    console.error(error);
    return readOnlyFallback();
  }
};

const normalizeProductInput = (body = {}) => ({
  drinkId: String(body.drinkId || body.id || "").trim(),
  name: String(body.name || "").trim(),
  category: String(body.category || body.categoryId || "").trim(),
  price: Number(body.price),
  description: String(body.description || "").trim(),
  imageUrl: String(body.imageUrl || "").trim(),
  temperatures: optionalArray(body.temperatures) || ["ICE"],
  isRecommended: body.isRecommended === true,
  isFeatured: body.isFeatured === true,
  isActive: body.isActive !== false,
  allowedSizes: optionalArray(body.allowedSizes),
  allowedSweetness: optionalArray(body.allowedSweetness),
  allowedIce: optionalArray(body.allowedIce),
  allowedOptions: optionalArray(body.allowedOptions),
  allowedToppings: optionalArray(body.allowedToppings),
  sortOrder: Number(body.sortOrder) || 9999,
});

const createProduct = async (body) => {
  const sql = await getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured.");
  await ensureCatalogSeeded(sql);

  const product = normalizeProductInput(body);
  if (!product.drinkId || !product.name || !product.category || !Number.isFinite(product.price)) {
    throw new Error("商品ID、商品名、カテゴリ、価格は必須です。");
  }

  await sql`
    insert into products (
      drink_id,
      name,
      category_id,
      price,
      description,
      image_url,
      temperatures,
      is_recommended,
      is_featured,
      is_active,
      allowed_sizes,
      allowed_sweetness,
      allowed_ice,
      allowed_options,
      allowed_toppings,
      sort_order
    ) values (
      ${product.drinkId},
      ${product.name},
      ${product.category},
      ${product.price},
      ${product.description},
      ${product.imageUrl},
      ${JSON.stringify(product.temperatures)},
      ${product.isRecommended},
      ${product.isFeatured},
      ${product.isActive},
      ${jsonParam(product.allowedSizes)},
      ${jsonParam(product.allowedSweetness)},
      ${jsonParam(product.allowedIce)},
      ${jsonParam(product.allowedOptions)},
      ${jsonParam(product.allowedToppings)},
      ${product.sortOrder}
    )
  `;

  return (await listProductCatalogForAdmin()).products.find((item) => item.drinkId === product.drinkId) || null;
};

const updateProduct = async (drinkId, body) => {
  const sql = await getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured.");
  await ensureCatalogSeeded(sql);

  const product = normalizeProductInput({ ...body, drinkId });
  if (!product.name || !product.category || !Number.isFinite(product.price)) {
    throw new Error("商品名、カテゴリ、価格は必須です。");
  }

  await sql`
    update products
    set
      name = ${product.name},
      category_id = ${product.category},
      price = ${product.price},
      description = ${product.description},
      image_url = ${product.imageUrl},
      temperatures = ${JSON.stringify(product.temperatures)},
      is_recommended = ${product.isRecommended},
      is_featured = ${product.isFeatured},
      is_active = ${product.isActive},
      allowed_sizes = ${jsonParam(product.allowedSizes)},
      allowed_sweetness = ${jsonParam(product.allowedSweetness)},
      allowed_ice = ${jsonParam(product.allowedIce)},
      allowed_options = ${jsonParam(product.allowedOptions)},
      allowed_toppings = ${jsonParam(product.allowedToppings)},
      sort_order = ${product.sortOrder},
      updated_at = now()
    where drink_id = ${drinkId}
  `;

  return (await listProductCatalogForAdmin()).products.find((item) => item.drinkId === drinkId) || null;
};

const deleteProduct = async (drinkId) => {
  const sql = await getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured.");

  await sql`delete from store_products where drink_id = ${drinkId}`;
  await sql`delete from products where drink_id = ${drinkId}`;
};

const normalizeCategoryInput = (body = {}) => ({
  id: String(body.id || body.categoryId || "").trim(),
  label: String(body.label || "").trim(),
  note: String(body.note || "").trim(),
  isTapiocaFree: body.isTapiocaFree === true,
  hasWhipByDefault: body.hasWhipByDefault === true,
  isActive: body.isActive !== false,
  sortOrder: Number(body.sortOrder) || 9999,
});

const createCategory = async (body) => {
  const sql = await getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured.");
  await ensureCatalogSeeded(sql);

  const category = normalizeCategoryInput(body);
  if (!category.id || !category.label) {
    throw new Error("カテゴリIDと表示名は必須です。");
  }

  await sql`
    insert into product_categories (
      category_id,
      label,
      note,
      is_tapioca_free,
      has_whip_by_default,
      sort_order,
      is_active
    ) values (
      ${category.id},
      ${category.label},
      ${category.note},
      ${category.isTapiocaFree},
      ${category.hasWhipByDefault},
      ${category.sortOrder},
      ${category.isActive}
    )
  `;

  return (await listProductCatalogForAdmin()).categories.find((item) => item.id === category.id) || null;
};

const normalizeSettingInput = (body = {}) => {
  const type = String(body.type || body.settingType || "").trim();
  const id = String(body.id || body.itemId || "").trim();
  const label = String(body.label || "").trim();
  const values = optionalArray(body.values);

  return {
    type,
    id,
    label,
    price: Number(body.price) || 0,
    values,
    sortOrder: Number(body.sortOrder) || 9999,
    isActive: body.isActive !== false,
  };
};

const createMenuSetting = async (body) => {
  const sql = await getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured.");
  await ensureCatalogSeeded(sql);

  const setting = normalizeSettingInput(body);
  if (!settingTypes.has(setting.type)) {
    throw new Error("設定タイプが正しくありません。");
  }
  if (!setting.id) {
    throw new Error("IDは必須です。");
  }
  if (["size", "option", "topping", "hotIce"].includes(setting.type) && !setting.label) {
    throw new Error("表示名は必須です。");
  }
  if (["sweetness", "ice"].includes(setting.type) && !setting.values?.length) {
    throw new Error("項目は1つ以上必要です。");
  }

  await sql`
    insert into menu_settings (
      setting_type,
      item_id,
      label,
      price,
      values_json,
      sort_order,
      is_active
    ) values (
      ${setting.type},
      ${setting.id},
      ${setting.label},
      ${setting.price},
      ${jsonParam(setting.values)},
      ${setting.sortOrder},
      ${setting.isActive}
    )
  `;

  return (await listProductCatalogForAdmin()).settingItems.find(
    (item) => item.type === setting.type && item.id === setting.id,
  ) || null;
};

const updateMenuSetting = async (type, id, body) => {
  const sql = await getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured.");
  await ensureCatalogSeeded(sql);

  const setting = normalizeSettingInput({ ...body, type, id });
  if (!settingTypes.has(setting.type)) {
    throw new Error("設定タイプが正しくありません。");
  }
  if (["size", "option", "topping", "hotIce"].includes(setting.type) && !setting.label) {
    throw new Error("表示名は必須です。");
  }
  if (["sweetness", "ice"].includes(setting.type) && !setting.values?.length) {
    throw new Error("項目は1つ以上必要です。");
  }

  await sql`
    update menu_settings
    set
      label = ${setting.label},
      price = ${setting.price},
      values_json = ${jsonParam(setting.values)},
      sort_order = ${setting.sortOrder},
      is_active = ${setting.isActive},
      updated_at = now()
    where setting_type = ${setting.type} and item_id = ${setting.id}
  `;

  return (await listProductCatalogForAdmin()).settingItems.find(
    (item) => item.type === setting.type && item.id === setting.id,
  ) || null;
};

const deleteMenuSetting = async (type, id) => {
  const sql = await getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured.");

  await sql`
    delete from menu_settings
    where setting_type = ${type} and item_id = ${id}
  `;
};

module.exports = {
  getProductCatalogMenu,
  listProductCatalogForAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  createMenuSetting,
  updateMenuSetting,
  deleteMenuSetting,
};
