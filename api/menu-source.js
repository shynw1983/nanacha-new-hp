const localMenu = require("../menu-data.js");

const SANITY_API_VERSION = "2025-02-19";

const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");

const categoryOrder = new Map(localMenu.categories.map((category, index) => [category.id, index]));

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

const normalizeSanityMenu = (documents = []) => {
  const drinks = documents
    .filter((item) => item && item.name && item.category && Number.isFinite(Number(item.price)))
    .map((item) =>
      withTemperatures({
        name: String(item.name),
        price: Number(item.price),
        category: String(item.category),
        temperatures: Array.isArray(item.temperatures) ? item.temperatures.map(String) : undefined,
        imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
      }),
    )
    .sort((a, b) => {
      const categoryDiff = (categoryOrder.get(a.category) ?? 999) - (categoryOrder.get(b.category) ?? 999);

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
    drinks,
  };
};

const fetchSanityMenu = async () => {
  const projectId = cleanEnv(process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);
  const dataset = cleanEnv(process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production");
  const token = cleanEnv(process.env.SANITY_API_TOKEN);

  if (!projectId || !dataset) {
    return null;
  }

  const query = `*[_type == "drink" && coalesce(isActive, true) == true] | order(coalesce(sortOrder, 9999) asc, name asc) {
    name,
    price,
    "category": category->id,
    temperatures,
    "imageUrl": image.asset->url
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
