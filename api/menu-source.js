const localMenu = require("../menu-data.js");

const SANITY_API_VERSION = "2025-02-19";

const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");

const categoryOrder = new Map(localMenu.categories.map((category, index) => [category.id, index]));

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

const normalizeSanityCategories = (documents = []) => {
  const categories = documents
    .filter((item) => item && item.id && item.label)
    .map((item) => ({
      id: String(item.id),
      label: String(item.label),
      note: item.note ? String(item.note) : "",
      isTapiocaFree: Boolean(item.isTapiocaFree),
      hasWhipByDefault: Boolean(item.hasWhipByDefault),
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : 9999,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "ja"))
    .map(({ sortOrder, ...category }) => category);

  return categories.length ? categories : localMenu.categories;
};

const normalizeSanityMenu = ({ drinks: drinkDocuments = [], categories: categoryDocuments = [], settings } = {}) => {
  const categories = normalizeSanityCategories(categoryDocuments);
  const sanityCategoryOrder = new Map(categories.map((category, index) => [category.id, index]));
  const tapiocaFreeCategories = categories
    .filter((category) => category.isTapiocaFree)
    .map((category) => category.id);
  const whippedCategories = categories
    .filter((category) => category.hasWhipByDefault)
    .map((category) => category.id);
  const drinks = drinkDocuments
    .filter((item) => item && item.name && item.category && Number.isFinite(Number(item.price)))
    .map((item) =>
      withTemperatures({
        name: String(item.name),
        price: Number(item.price),
        category: String(item.category),
        description: item.description ? String(item.description) : "",
        temperatures: Array.isArray(item.temperatures) ? item.temperatures.map(String) : undefined,
        imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
        isRecommended: Boolean(item.isRecommended),
        isFeatured: Boolean(item.isFeatured),
      }),
    )
    .sort((a, b) => {
      const categoryDiff = (sanityCategoryOrder.get(a.category) ?? 999) - (sanityCategoryOrder.get(b.category) ?? 999);

      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      return a.name.localeCompare(b.name, "ja");
    });

  if (!drinks.length) {
    return localMenu;
  }

  return {
    ...localMenu,
    categories,
    drinks,
    sizes: normalizePricedItems(settings?.sizes, localMenu.sizes),
    sweetness: normalizeStrings(settings?.sweetness, localMenu.sweetness),
    ice: normalizeStrings(settings?.ice, localMenu.ice),
    hotIce: settings?.hotIce ? String(settings.hotIce) : localMenu.hotIce,
    options: normalizePricedItems(settings?.options, localMenu.options),
    toppings: normalizePricedItems(settings?.toppings, localMenu.toppings),
    tapiocaFreeCategories: tapiocaFreeCategories.length ? tapiocaFreeCategories : localMenu.tapiocaFreeCategories,
    whippedCategories: whippedCategories.length ? whippedCategories : localMenu.whippedCategories,
  };
};

const fetchSanityMenu = async () => {
  const projectId = cleanEnv(process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);
  const dataset = cleanEnv(process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production");
  const token = cleanEnv(process.env.SANITY_API_TOKEN);

  if (!projectId || !dataset) {
    return null;
  }

  const query = `{
    "categories": *[_type == "category"] | order(coalesce(sortOrder, 9999) asc, label asc) {
      id,
      label,
      note,
      isTapiocaFree,
      hasWhipByDefault,
      sortOrder
    },
    "drinks": *[_type == "drink" && coalesce(isActive, true) == true] | order(coalesce(sortOrder, 9999) asc, name asc) {
      name,
      price,
      description,
      "category": category->id,
      temperatures,
      isRecommended,
      isFeatured,
      "imageUrl": image.asset->url
    },
    "settings": *[_type == "menuSettings"][0] {
      sizes,
      sweetness,
      ice,
      hotIce,
      options,
      toppings
    }
  }`;
  const url = new URL(`https://${projectId}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${dataset}`);
  url.searchParams.set("query", query);

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Sanity menu request failed: ${response.status}`);
  }

  const body = await response.json();
  return normalizeSanityMenu(body.result);
};

const getMenuData = async () => {
  try {
    return (await fetchSanityMenu()) || localMenu;
  } catch (error) {
    console.error(error);
    return localMenu;
  }
};

module.exports = {
  getMenuData,
  localMenu,
};
