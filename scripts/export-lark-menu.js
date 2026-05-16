const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
const path = require("path");
const menu = require("../menu-data.js");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "lark-import");
const menuHtmlPath = path.join(root, "menu.html");
const menuHtml = existsSync(menuHtmlPath) ? readFileSync(menuHtmlPath, "utf8") : "";

const stripTags = (value = "") => value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const parseDrinkDescriptions = () => {
  const descriptions = new Map();
  const pattern = /<h3>([^<]+)<\/h3><p>([^<]+)<\/p>/g;
  let match;

  while ((match = pattern.exec(menuHtml))) {
    descriptions.set(stripTags(match[1]), stripTags(match[2]));
  }

  return descriptions;
};

const parseCategoryNotes = () => {
  const notes = new Map();
  const pattern = /<article class="menu-category" data-menu-category="([^"]+)">([\s\S]*?)<\/article>/g;
  let match;

  while ((match = pattern.exec(menuHtml))) {
    const body = match[2];
    const title = stripTags((body.match(/<h2[\s\S]*?<\/h2>/) || [""])[0]);
    const note = stripTags((body.match(/<p class="category-note">([^<]+)<\/p>/) || ["", ""])[1]);
    const category = match[1] === "tea" && title.includes("チーズ") ? "cheese-tea" : match[1];

    if (note) {
      notes.set(category, note);
    }
  }

  return notes;
};

const csv = (rows) =>
  rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? "");
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");

const descriptions = parseDrinkDescriptions();
const categoryNotes = parseCategoryNotes();
const recommended = new Set([
  "黒糖タピオカミルク",
  "オレオタピオカフラッペ",
  "黒糖タピオカ八女抹茶ラテ",
  "濃厚マンゴーヨーグルトスムージー",
]);

const categoryRows = [
  ["id", "label", "note", "isTapiocaFree", "hasWhipByDefault", "sortOrder"],
  ...menu.categories.map((category, index) => [
    category.id,
    category.label,
    categoryNotes.get(category.id) || "",
    menu.tapiocaFreeCategories.includes(category.id),
    menu.whippedCategories.includes(category.id),
    (index + 1) * 10,
  ]),
];

const drinkRows = [
  [
    "name",
    "category",
    "price",
    "description",
    "temperatures",
    "isRecommended",
    "isFeatured",
    "isActive",
    "sortOrder",
    "imageFile",
    "imageUrl",
  ],
  ...menu.drinks.map((drink, index) => [
    drink.name,
    drink.category,
    drink.price,
    descriptions.get(drink.name) || "",
    (drink.temperatures || ["ICE"]).join(","),
    recommended.has(drink.name),
    drink.name === "黒糖タピオカミルク",
    true,
    (index + 1) * 10,
    index < 42 ? `assets/menu/drink-${String(index + 1).padStart(2, "0")}.png` : "",
    "",
  ]),
];

const settingsRows = [
  ["type", "id", "label", "price", "values"],
  ...menu.sizes.map((item) => ["size", item.id, item.label, item.price, ""]),
  ...menu.options.map((item) => ["option", item.id, item.label, item.price, ""]),
  ...menu.toppings.map((item) => ["topping", item.id, item.label, item.price, ""]),
  ["sweetness", "", "", "", menu.sweetness.join(",")],
  ["ice", "", "", "", menu.ice.join(",")],
  ["hotIce", "", "", "", menu.hotIce],
];

mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, "categories.csv"), `${csv(categoryRows)}\n`);
writeFileSync(path.join(outputDir, "drinks.csv"), `${csv(drinkRows)}\n`);
writeFileSync(path.join(outputDir, "menu-settings.csv"), `${csv(settingsRows)}\n`);

console.log(`Exported Lark import files to ${path.relative(root, outputDir)}/`);
