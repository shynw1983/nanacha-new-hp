const localMenu = require("../menu-data.js");
const publishedMenu = require("../published/menu.json");
const localDrinkDescriptions = require("../data/menu-descriptions.js");
const localCategoryNotes = require("../data/category-notes.js");
const {
  cleanEnv,
  textValue,
  booleanValue,
  imageValue,
  getTenantAccessToken,
  fetchAllRecords,
} = require("./lark-utils");
const { applyStoreProductAvailability } = require("./store-products");
const arrayValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(textValue).filter(Boolean);
  }

  return textValue(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const withLocalDescriptions = (menu) => ({
  ...menu,
  categories: menu.categories.map((category) => ({
    ...category,
    note: category.note || localCategoryNotes[category.id] || "",
  })),
  drinks: menu.drinks.map((drink) => ({
    ...drink,
    description: drink.description || localDrinkDescriptions[drink.name] || "",
  })),
});
const fallbackMenu = withLocalDescriptions(localMenu);

const normalizePricedItems = (items, fallback) => {
  if (!Array.isArray(items) || !items.length) {
    return fallback;
  }

  const normalized = items
    .filter((item) => item && item.id && item.label && Number.isFinite(Number(item.price)))
    .map((item) => ({
      id: String(item.id),
      label: String(item.label),
      price: Number(item.price),
    }));

  return normalized.length ? normalized : fallback;
};

const normalizeStrings = (items, fallback) => {
  if (!Array.isArray(items) || !items.length) {
    return fallback;
  }

  const normalized = items.map(String).filter(Boolean);
  return normalized.length ? normalized : fallback;
};

const normalizeOptionalStrings = (value) => {
  const normalized = arrayValue(value);
  return normalized.length ? normalized : undefined;
};

const withTemperatures = (drink) => {
  if (Array.isArray(drink.temperatures) && drink.temperatures.length) {
    return drink;
  }

  const localDrink = localMenu.drinks.find((item) => item.name === drink.name);

  return {
    ...drink,
    temperatures: localDrink?.temperatures || ["ICE"],
  };
};


const parseStores = () => {
  const raw = cleanEnv(process.env.LARK_STORES_JSON);

  if (!raw) {
    return [
      {
        id: "kiyokawa",
        label: "福岡清川店",
        appToken: "",
        storeDrinksTableId: "",
      },
    ];
  }

  try {
    return JSON.parse(raw)
      .filter((store) => store?.id && store?.label)
      .map((store) => ({
        id: textValue(store.id),
        label: textValue(store.label),
        appToken: textValue(store.appToken),
        storeDrinksTableId: textValue(store.storeDrinksTableId),
      }));
  } catch {
    return [];
  }
};

const normalizeLarkMenu = ({ categoryRecords = [], drinkRecords = [], settingsRecords = [], stores = [] } = {}) => {
  const categories = categoryRecords
    .map((record) => record.fields || {})
    .filter((fields) => fields.id && fields.label)
    .map((fields) => ({
      id: textValue(fields.id),
      label: textValue(fields.label),
      note: textValue(fields.note),
      isTapiocaFree: booleanValue(fields.isTapiocaFree),
      hasWhipByDefault: booleanValue(fields.hasWhipByDefault),
      sortOrder: Number(fields.sortOrder) || 9999,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "ja"))
    .map(({ sortOrder, ...category }) => category);

  const categoryOrder = new Map(categories.map((category, index) => [category.id, index]));
  const drinks = drinkRecords
    .map((record) => record.fields || {})
    .filter((fields) => fields.name && fields.category && Number.isFinite(Number(fields.price)))
    .map((fields) =>
      withTemperatures({
        id: textValue(fields.drinkId) || textValue(fields.id) || textValue(fields.name),
        name: textValue(fields.name),
        category: textValue(fields.category),
        price: Number(fields.price),
        description: textValue(fields.description) || localDrinkDescriptions[textValue(fields.name)] || "",
        imageUrl: textValue(fields.imageFile) || textValue(fields.imageUrl) || imageValue(fields.image),
        temperatures: arrayValue(fields.temperatures),
        isRecommended: booleanValue(fields.isRecommended),
        isFeatured: booleanValue(fields.isFeatured),
        isActive: booleanValue(fields.isActive),
        allowedSizes: normalizeOptionalStrings(fields.allowedSizes),
        allowedSweetness: normalizeOptionalStrings(fields.allowedSweetness),
        allowedIce: normalizeOptionalStrings(fields.allowedIce),
        allowedOptions: normalizeOptionalStrings(fields.allowedOptions),
        allowedToppings: normalizeOptionalStrings(fields.allowedToppings),
        sortOrder: Number(fields.sortOrder) || 9999,
      }),
    )
    .filter((drink) => drink.isActive)
    .sort((a, b) => {
      const categoryDiff = (categoryOrder.get(a.category) ?? 999) - (categoryOrder.get(b.category) ?? 999);

      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ja");
    })
    .map(({ sortOrder, isActive, ...drink }) => drink);

  const settingsRows = settingsRecords.map((record) => record.fields || {});
  const getSettingsByType = (type) =>
    settingsRows
      .filter((fields) => textValue(fields.type) === type)
      .map((fields) => ({
        id: textValue(fields.id),
        label: textValue(fields.label),
        price: Number(fields.price) || 0,
        values: textValue(fields.values),
      }));
  const singleValue = (type) => getSettingsByType(type)[0]?.values || "";
  const tapiocaFreeCategories = categories.filter((category) => category.isTapiocaFree).map((category) => category.id);
  const whippedCategories = categories.filter((category) => category.hasWhipByDefault).map((category) => category.id);

  if (!categories.length || !drinks.length) {
    return fallbackMenu;
  }

  return {
    ...fallbackMenu,
    categories,
    stores,
    drinks,
    sizes: normalizePricedItems(getSettingsByType("size"), fallbackMenu.sizes),
    sweetness: normalizeStrings(arrayValue(singleValue("sweetness")), fallbackMenu.sweetness),
    ice: normalizeStrings(arrayValue(singleValue("ice")), fallbackMenu.ice),
    hotIce: singleValue("hotIce") || fallbackMenu.hotIce,
    options: normalizePricedItems(getSettingsByType("option"), fallbackMenu.options),
    toppings: normalizePricedItems(getSettingsByType("topping"), fallbackMenu.toppings),
    tapiocaFreeCategories: tapiocaFreeCategories.length ? tapiocaFreeCategories : fallbackMenu.tapiocaFreeCategories,
    whippedCategories: whippedCategories.length ? whippedCategories : fallbackMenu.whippedCategories,
  };
};

const fetchLarkMenu = async (token) => {
  if (!token) {
    return null;
  }

  const stores = parseStores();
  const [categoryRecords, drinkRecords, settingsRecords] = await Promise.all([
    fetchAllRecords(token, cleanEnv(process.env.LARK_CATEGORIES_TABLE_ID)),
    fetchAllRecords(token, cleanEnv(process.env.LARK_DRINKS_TABLE_ID)),
    fetchAllRecords(token, cleanEnv(process.env.LARK_MENU_SETTINGS_TABLE_ID)),
  ]);

  return normalizeLarkMenu({
    categoryRecords,
    drinkRecords,
    settingsRecords,
    stores,
  });
};

const applyStoreAvailability = async (token, menu, storeId) => {
  if (!storeId) {
    return menu;
  }

  const store = menu.stores.find((item) => item.id === storeId);

  if (!store?.appToken || !store?.storeDrinksTableId) {
    return {
      ...menu,
      selectedStoreId: storeId,
      drinks: [],
    };
  }

  const records = await fetchAllRecords(token, store.storeDrinksTableId, store.appToken);
  const availabilityByDrinkId = new Map(
    records
      .map((record) => record.fields || {})
      .filter((fields) => fields.drinkId)
      .map((fields) => [
        textValue(fields.drinkId),
        {
          isAvailable: booleanValue(fields.isAvailable),
          websiteEnabled: booleanValue(fields.websiteEnabled),
          websitePriceOverride: Number.isFinite(Number(fields.websitePriceOverride))
            ? Number(fields.websitePriceOverride)
            : null,
        },
      ]),
  );

  return {
    ...menu,
    selectedStoreId: storeId,
    drinks: menu.drinks
      .map((drink) => {
        const availability = availabilityByDrinkId.get(drink.id);

        if (!availability) {
          return {
            ...drink,
            isAvailable: false,
            websiteEnabled: false,
          };
        }

        return {
          ...drink,
          price: availability.websitePriceOverride ?? drink.price,
          isAvailable: availability.isAvailable,
          websiteEnabled: availability.websiteEnabled,
        };
      })
      .filter((drink) => drink.isAvailable),
  };
};

const getLiveMenuData = async (storeId = "") => {
  const token = await getTenantAccessToken();

  if (!token) {
    throw new Error("Lark is not configured.");
  }

  const menu = await fetchLarkMenu(token);
  const selectedStoreId = storeId || menu.stores?.[0]?.id || "";
  return applyStoreAvailability(token, menu, selectedStoreId);
};

const getMenuData = async (storeId = "") => {
  const baseMenu = publishedMenu.baseMenu || fallbackMenu;

  if (!storeId) {
    return baseMenu;
  }

  try {
    return await applyStoreProductAvailability(baseMenu, storeId);
  } catch (error) {
    console.error(error);
  }

  return publishedMenu.storeMenus?.[storeId] || {
    ...baseMenu,
    selectedStoreId: storeId,
    drinks: [],
  };
};

module.exports = {
  getMenuData,
  getLiveMenuData,
  fallbackMenu,
  localMenu,
};
