const { createHash } = require("crypto");
const { existsSync, readFileSync } = require("fs");
const path = require("path");
const menu = require("../menu-data.js");

const SANITY_API_VERSION = "2025-02-19";

const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");

const projectId = cleanEnv(process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);
const dataset = cleanEnv(process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || "production");
const token = cleanEnv(process.env.SANITY_API_TOKEN);

const hashId = (value) => createHash("sha1").update(value).digest("hex").slice(0, 12);

const categoryId = (id) => `category.${id}`;

const drinkId = (drink) => `drink.${hashId(`${drink.category}:${drink.name}`)}`;

const drinkImagePath = (index) => {
  if (index >= 42) {
    return null;
  }

  return path.join(__dirname, "..", "assets", "menu", `drink-${String(index + 1).padStart(2, "0")}.png`);
};

const createImageField = (assetId) => ({
  _type: "image",
  asset: {
    _type: "reference",
    _ref: assetId,
  },
});

const fetchExistingDrinkImages = async (ids) => {
  const query = `*[_type == "drink" && _id in $ids]{ _id, "hasImage": defined(image.asset._ref) }`;
  const url = new URL(`https://${projectId}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${dataset}`);
  url.searchParams.set("query", query);
  url.searchParams.set("$ids", JSON.stringify(ids));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await response.json();

  if (!response.ok) {
    console.error(JSON.stringify(body, null, 2));
    fail(`Sanity image lookup failed with status ${response.status}.`);
  }

  return new Map((body.result || []).map((document) => [document._id, Boolean(document.hasImage)]));
};

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

const uploadDrinkImage = async (drink, index) => {
  const imagePath = drinkImagePath(index);

  if (!imagePath || !existsSync(imagePath)) {
    return null;
  }

  const filename = `${drinkId(drink)}.png`;
  const url = new URL(`https://${projectId}.api.sanity.io/v${SANITY_API_VERSION}/assets/images/${dataset}`);
  url.searchParams.set("filename", filename);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "image/png",
    },
    body: readFileSync(imagePath),
  });
  const body = await response.json();

  if (!response.ok) {
    console.error(JSON.stringify(body, null, 2));
    fail(`Image upload failed for ${drink.name} with status ${response.status}.`);
  }

  return body.document?._id || null;
};

const categoryMutations = (document) => [
  { createIfNotExists: document },
  {
    patch: {
      id: document._id,
      set: {
        id: document.id,
        label: document.label,
        sortOrder: document.sortOrder,
      },
    },
  },
];

const drinkMutations = (document, imageAssetId) => {
  const { _id, _type, image, ...fields } = {
    ...document,
    ...(imageAssetId ? { image: createImageField(imageAssetId) } : {}),
  };
  const mutations = [
    { createIfNotExists: { _id, _type, ...fields, ...(image ? { image } : {}) } },
    {
      patch: {
        id: _id,
        set: fields,
      },
    },
  ];

  if (image) {
    mutations.push({
      patch: {
        id: _id,
        setIfMissing: { image },
      },
    });
  }

  return mutations;
};

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

  const imageAssetIds = [];

  const drinkDocuments = menu.drinks.map(createDrinkDocument);
  const existingDrinkImages = await fetchExistingDrinkImages(drinkDocuments.map((document) => document._id));

  for (const [index, drink] of menu.drinks.entries()) {
    if (!existingDrinkImages.get(drinkDocuments[index]._id)) {
      imageAssetIds[index] = await uploadDrinkImage(drink, index);
    }
  }

  const mutations = [
    ...menu.categories.flatMap((category, index) => categoryMutations(createCategoryDocument(category, index))),
    ...drinkDocuments.flatMap((document, index) => drinkMutations(document, imageAssetIds[index])),
  ];
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

  console.log(
    `Imported ${menu.categories.length} categories, ${menu.drinks.length} drinks, and ${imageAssetIds.filter(Boolean).length} drink images to Sanity.`,
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
