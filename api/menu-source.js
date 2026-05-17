const { existsSync, readFileSync } = require("fs");
const path = require("path");
const localMenu = require("../menu-data.js");

const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");
const textValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(textValue).filter(Boolean).join(", ");
  }

  if (value && typeof value === "object") {
    return value.text || value.name || value.link || value.url || "";
  }

  return value == null ? "" : String(value);
};
const booleanValue = (value) => value === true || value === "true" || value === "TRUE" || value === 1;
const arrayValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(textValue).filter(Boolean);
  }

  return textValue(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};
const imageValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(imageValue).find(Boolean) || "";
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  if (value.file_token && value.url) {
    try {
      const sourceUrl = new URL(value.url);
      const extra = JSON.parse(sourceUrl.searchParams.get("extra") || "{}");
      const tableId = extra.bitablePerm?.tableId;
      const rev = extra.bitablePerm?.rev;

      if (tableId && rev != null) {
        const proxyUrl = new URL("/api/menu-image", "https://example.com");
        proxyUrl.searchParams.set("file_token", value.file_token);
        proxyUrl.searchParams.set("table_id", tableId);
        proxyUrl.searchParams.set("rev", String(rev));
        return `${proxyUrl.pathname}${proxyUrl.search}`;
      }
    } catch {
      // Fall through to other supported image sources.
    }
  }

  return value.url || value.tmp_url || value.link || "";
};

const menuHtmlPath = path.join(__dirname, "..", "menu.html");
const menuHtml = existsSync(menuHtmlPath) ? readFileSync(menuHtmlPath, "utf8") : "";

const stripTags = (value = "") => value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const parseLocalDrinkDescriptions = () => {
  const descriptions = new Map();
  const pattern = /<h3>([^<]+)<\/h3><p>([^<]+)<\/p>/g;
  let match;

  while ((match = pattern.exec(menuHtml))) {
    descriptions.set(stripTags(match[1]), stripTags(match[2]));
  }

  return descriptions;
};

const localDrinkDescriptions = parseLocalDrinkDescriptions();
const withLocalDescriptions = (menu) => ({
  ...menu,
  drinks: menu.drinks.map((drink) => ({
    ...drink,
    description: drink.description || localDrinkDescriptions.get(drink.name) || "",
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

const getTenantAccessToken = async () => {
  const appId = cleanEnv(process.env.LARK_APP_ID);
  const appSecret = cleanEnv(process.env.LARK_APP_SECRET);

  if (!appId || !appSecret) {
    return null;
  }

  const response = await fetch("https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
  });
  const body = await response.json();

  if (!response.ok || body.code !== 0 || !body.tenant_access_token) {
    throw new Error(`Lark auth failed: ${body.msg || response.status}`);
  }

  return body.tenant_access_token;
};

const fetchAllRecords = async (token, tableId, appToken = cleanEnv(process.env.LARK_BASE_APP_TOKEN)) => {

  if (!appToken || !tableId) {
    return [];
  }

  const records = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
    );
    url.searchParams.set("page_size", "500");

    if (pageToken) {
      url.searchParams.set("page_token", pageToken);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const body = await response.json();

    if (!response.ok || body.code !== 0) {
      throw new Error(`Lark records request failed: ${body.msg || response.status}`);
    }

    records.push(...(body.data?.items || []));
    pageToken = body.data?.page_token || "";
  } while (pageToken);

  return records;
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
        description: textValue(fields.description) || localDrinkDescriptions.get(textValue(fields.name)) || "",
        imageUrl: imageValue(fields.image) || textValue(fields.imageUrl) || textValue(fields.imageFile),
        temperatures: arrayValue(fields.temperatures),
        isRecommended: booleanValue(fields.isRecommended),
        isFeatured: booleanValue(fields.isFeatured),
        isActive: fields.isActive == null ? true : booleanValue(fields.isActive),
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

const getMenuData = async (storeId = "") => {
  try {
    const token = await getTenantAccessToken();
    const menu = (await fetchLarkMenu(token)) || fallbackMenu;
    const selectedStoreId = storeId || menu.stores?.[0]?.id || "";
    return token ? applyStoreAvailability(token, menu, selectedStoreId) : menu;
  } catch (error) {
    console.error(error);
    return fallbackMenu;
  }
};

module.exports = {
  getMenuData,
  localMenu,
};
