const { createHash } = require("crypto");
const menu = require("../menu-data.js");

const SANITY_API_VERSION = "2025-02-19";

const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");

const projectId = cleanEnv(process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);
const dataset = cleanEnv(process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production");
const token = cleanEnv(process.env.SANITY_API_TOKEN);

const hashId = (value) => createHash("sha1").update(value).digest("hex").slice(0, 12);

const categoryId = (id) => `category.${id}`;

const drinkId = (drink) => `drink.${hashId(`${drink.category}:${drink.name}`)}`;

const createCategoryDocument = (category, index) => ({
  _id: categoryId(category.id),
  _type: "category",
  id: category.id,
  label: category.label,
  sortOrder: (index + 1) * 10,
});

const createDrinkDocument = (drink, index) => ({
  _id: drinkId(drink),
  _type: "drink",
  name: drink.name,
  price: drink.price,
  category: {
    _type: "reference",
    _ref: categoryId(drink.category),
  },
  temperatures: drink.temperatures || ["ICE"],
  isActive: true,
  isRecommended: false,
  sortOrder: (index + 1) * 10,
});

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const main = async () => {
  if (!projectId) {
    fail("Missing SANITY_PROJECT_ID.");
  }

  if (!dataset) {
    fail("Missing SANITY_DATASET.");
  }

  if (!token) {
    fail("Missing SANITY_API_TOKEN. Use a Sanity token with write permissions.");
  }

  const documents = [
    ...menu.categories.map(createCategoryDocument),
    ...menu.drinks.map(createDrinkDocument),
  ];
  const mutations = documents.map((document) => ({ createOrReplace: document }));
  const url = `https://${projectId}.api.sanity.io/v${SANITY_API_VERSION}/data/mutate/${dataset}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mutations }),
  });
  const body = await response.json();

  if (!response.ok) {
    console.error(JSON.stringify(body, null, 2));
    fail(`Sanity import failed with status ${response.status}.`);
  }

  console.log(`Imported ${menu.categories.length} categories and ${menu.drinks.length} drinks to Sanity.`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
