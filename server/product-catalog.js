const publishedMenu = require("../published/menu.json");
const localCategoryNotes = require("../data/category-notes.js");
const localDrinkDescriptions = require("../data/menu-descriptions.js");

const basePublishedMenu = publishedMenu.baseMenu;
const defaultOsMenuApiUrl = "https://foundr1.jp/api/public/menus?brand=nanacha";
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

const optionId = (option) => String(option?.optionKey || option?.id || option?.externalId || "").trim();
const optionLabel = (option) => String(option?.label || option?.name || "").trim();
const toPricedOption = (option) => ({
  id: optionId(option),
  label: optionLabel(option),
  displayNames: option?.displayNames || {},
  price: Number(option?.price ?? option?.priceDelta ?? 0),
});
const optionGroupByKey = (groups, key) => groups.find((group) => group.groupKey === key);
const optionsForGroup = (groups, key) => {
  const group = optionGroupByKey(groups, key);
  return Array.isArray(group?.options) ? group.options : [];
};
const scopedValues = (groups, key, mapper) => optionsForGroup(groups, key).map(mapper).filter(Boolean);
const intersectConfiguredValues = (configured, scoped) => {
  const values = asArray(configured);
  return values.length ? scoped.filter((value) => values.includes(value)) : scoped;
};
const categoryId = (category) => String(category.externalId || category.id || category.name || "").trim();
const normalizeCategory = (category) => ({
  id: categoryId(category),
  label: String(category.label || category.name || categoryId(category)).trim(),
  displayNames: category.displayNames || {},
  note: category.note || localCategoryNotes[categoryId(category)] || "",
  isTapiocaFree: category.isTapiocaFree === true,
  hasWhipByDefault: category.hasWhipByDefault === true,
});
const normalizeStandardMenu = (payload) => {
  if (!Array.isArray(payload?.items) || !payload.items.length) return null;
  const groups = Array.isArray(payload.optionGroups) ? payload.optionGroups : [];
  const sizes = optionsForGroup(groups, "size").map(toPricedOption).filter((item) => item.id && item.label);
  const sweetness = optionsForGroup(groups, "sweetness").map(optionLabel).filter(Boolean);
  const ice = optionsForGroup(groups, "ice").map(optionLabel).filter(Boolean);
  const menuOptions = optionsForGroup(groups, "option").map(toPricedOption).filter((item) => item.id && item.label);
  const toppings = optionsForGroup(groups, "topping").map(toPricedOption).filter((item) => item.id && item.label);
  const categories = Array.isArray(payload.categories) && payload.categories.length
    ? payload.categories.map(normalizeCategory)
    : basePublishedMenu.categories;
  const categoryByName = new Map(categories.map((category) => [category.label, category]));
  const drinks = payload.items
    .filter((item) => item.websiteEnabled !== false && item.isAvailable !== false)
    .map((item) => {
      const schema = item.variableSchema || {};
      const itemGroups = Array.isArray(item.optionGroups) ? item.optionGroups : groups;
      const category = categoryByName.get(item.category) || categories.find((entry) => entry.id === item.category);
      return {
        id: String(item.externalId || item.id || "").trim(),
        menuCatalogItemId: String(item.id || "").trim(),
        name: String(item.name || "").trim(),
        displayNames: item.displayNames || {},
        category: category?.id || item.category || "menu",
        price: Number(item.priceOverride ?? item.basePrice ?? 0),
        description: item.description || localDrinkDescriptions[item.name] || "",
        descriptionDisplayNames: item.descriptionDisplayNames || {},
        imageUrl: item.imageUrl || "",
        strictOptionScopes: Array.isArray(item.optionGroups),
        temperatures: intersectConfiguredValues(schema.temperatures, scopedValues(itemGroups, "temperature", optionLabel)),
        isRecommended: schema.isRecommended === true,
        isFeatured: schema.isFeatured === true,
        allowedSizes: intersectConfiguredValues(schema.allowedSizes, scopedValues(itemGroups, "size", optionId)),
        allowedSweetness: intersectConfiguredValues(schema.allowedSweetness, scopedValues(itemGroups, "sweetness", optionLabel)),
        allowedIce: intersectConfiguredValues(schema.allowedIce, scopedValues(itemGroups, "ice", optionLabel)),
        allowedOptions: intersectConfiguredValues(schema.allowedOptions, scopedValues(itemGroups, "option", optionId)),
        allowedToppings: intersectConfiguredValues(schema.allowedToppings, scopedValues(itemGroups, "topping", optionId)),
        isAvailable: item.isAvailable !== false,
        websiteEnabled: item.websiteEnabled !== false,
        isActive: item.isActive !== false,
      };
    })
    .filter((drink) => drink.id && drink.name);

  return {
    ...basePublishedMenu,
    source: "foundr1-os",
    categories,
    drinks,
    sizes: sizes.length ? sizes : basePublishedMenu.sizes,
    sweetness: sweetness.length ? sweetness : basePublishedMenu.sweetness,
    ice: ice.length ? ice : basePublishedMenu.ice,
    hotIce: String(optionGroupByKey(groups, "ice")?.ruleJson?.hotValue || basePublishedMenu.hotIce),
    options: menuOptions.length ? menuOptions : basePublishedMenu.options,
    toppings: toppings.length ? toppings : basePublishedMenu.toppings,
    tapiocaFreeCategories: categories.filter((category) => category.isTapiocaFree).map((category) => category.id),
    whippedCategories: categories.filter((category) => category.hasWhipByDefault).map((category) => category.id),
    stores: Array.isArray(payload.stores) && payload.stores.length ? payload.stores : basePublishedMenu.stores,
    selectedStoreId: payload.selectedStoreId || basePublishedMenu.selectedStoreId,
    storeOperation: {
      ...(basePublishedMenu.storeOperation || {}),
      ...(payload.storeOperation || {}),
    },
  };
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
    descriptionDisplayNames: drink.descriptionDisplayNames || {},
    isActive: drink.isActive !== false,
  })),
});

const normalizeOsMenu = (payload) => {
  const standardMenu = normalizeStandardMenu(payload);
  if (standardMenu) {
    const rawMinimumPickupMinutes = standardMenu.storeOperation?.minimumPickupMinutes;
    const hasConfiguredMinimumPickupMinutes = rawMinimumPickupMinutes !== null && rawMinimumPickupMinutes !== undefined && rawMinimumPickupMinutes !== "";
    return {
      ...standardMenu,
      storeOperation: {
        ...(standardMenu.storeOperation || {}),
        minimumPickupMinutes: hasConfiguredMinimumPickupMinutes && Number.isFinite(Number(rawMinimumPickupMinutes))
          ? Math.max(0, Math.min(240, Math.round(Number(rawMinimumPickupMinutes))))
          : 5,
      },
    };
  }
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
      descriptionDisplayNames: drink.descriptionDisplayNames || {},
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
