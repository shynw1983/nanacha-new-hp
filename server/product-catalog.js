const publishedMenu = require("../published/menu.json");
const localCategoryNotes = require("../data/category-notes.js");
const localDrinkDescriptions = require("../data/menu-descriptions.js");

const basePublishedMenu = publishedMenu.baseMenu;
const defaultOsMenuApiUrl = "https://foundr1.jp/api/public/menus/nanacha-compatible";
const brandMenuRevalidateSeconds = 300;
const storeMenuRevalidateSeconds = 15;

const asArray = (value) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
};

const fallbackMenu = () => ({
  ...basePublishedMenu,
  storeOperation: {
    ...(basePublishedMenu.storeOperation || {}),
    minimumPickupMinutes: 5,
  },
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

const normalizeOsMenu = (payload) => {
  const menu = payload?.baseMenu;
  if (!menu || !Array.isArray(menu.categories) || !Array.isArray(menu.drinks) || !menu.categories.length || !menu.drinks.length) {
    return null;
  }
  const rawMinimumPickupMinutes = menu.storeOperation?.minimumPickupMinutes;
  const hasConfiguredMinimumPickupMinutes = rawMinimumPickupMinutes !== null && rawMinimumPickupMinutes !== undefined && rawMinimumPickupMinutes !== "";

  return {
    ...basePublishedMenu,
    ...menu,
    source: "foundr1-os",
    categories: menu.categories.map((category) => ({
      ...category,
      note: category.note || localCategoryNotes[category.id] || "",
    })),
    drinks: menu.drinks.map((drink) => ({
      ...drink,
      description: drink.description || localDrinkDescriptions[drink.name] || "",
      temperatures: asArray(drink.temperatures).length ? asArray(drink.temperatures) : ["ICE"],
      isActive: drink.isActive !== false,
    })),
    sizes: Array.isArray(menu.sizes) && menu.sizes.length ? menu.sizes : basePublishedMenu.sizes,
    sweetness: Array.isArray(menu.sweetness) && menu.sweetness.length ? menu.sweetness : basePublishedMenu.sweetness,
    ice: Array.isArray(menu.ice) && menu.ice.length ? menu.ice : basePublishedMenu.ice,
    hotIce: menu.hotIce || basePublishedMenu.hotIce,
    options: Array.isArray(menu.options) && menu.options.length ? menu.options : basePublishedMenu.options,
    toppings: Array.isArray(menu.toppings) && menu.toppings.length ? menu.toppings : basePublishedMenu.toppings,
    tapiocaFreeCategories: Array.isArray(menu.tapiocaFreeCategories)
      ? menu.tapiocaFreeCategories
      : basePublishedMenu.tapiocaFreeCategories,
    whippedCategories: Array.isArray(menu.whippedCategories) ? menu.whippedCategories : basePublishedMenu.whippedCategories,
    stores: Array.isArray(menu.stores) && menu.stores.length ? menu.stores : basePublishedMenu.stores,
    selectedStoreId: menu.selectedStoreId || basePublishedMenu.selectedStoreId,
    storeOperation: {
      ...(basePublishedMenu.storeOperation || {}),
      ...(menu.storeOperation || {}),
      minimumPickupMinutes: hasConfiguredMinimumPickupMinutes && Number.isFinite(Number(rawMinimumPickupMinutes))
        ? Math.max(0, Math.min(240, Math.round(Number(rawMinimumPickupMinutes))))
        : 5,
    },
  };
};

const fetchOsMenu = async (storeId = "", options = {}) => {
  const baseUrl = process.env.FOUNDR1_OS_MENU_API_URL || defaultOsMenuApiUrl;
  if (!baseUrl || baseUrl === "off") return null;

  try {
    const url = new URL(baseUrl);
    if (storeId) url.searchParams.set("store", storeId);

    const headers = { Accept: "application/json" };
    if (process.env.FOUNDR1_OS_MENU_API_BYPASS_SECRET) {
      headers["x-vercel-protection-bypass"] = process.env.FOUNDR1_OS_MENU_API_BYPASS_SECRET;
    }

    const fetchOptions = {
      headers,
      next: { revalidate: storeId ? storeMenuRevalidateSeconds : brandMenuRevalidateSeconds },
    };
    if (options.noStore) {
      delete fetchOptions.next;
      fetchOptions.cache = "no-store";
      url.searchParams.set("_", String(Date.now()));
    }

    const response = await fetch(url.toString(), fetchOptions);
    if (!response.ok) {
      throw new Error(`Foundr1 OS menu returned ${response.status}`);
    }
    return normalizeOsMenu(await response.json());
  } catch (error) {
    console.error(error);
    return null;
  }
};

const getProductCatalogMenu = async (storeId = "", options = {}) => (await fetchOsMenu(storeId, options)) || fallbackMenu();

module.exports = {
  getProductCatalogMenu,
  fallbackMenu,
};
