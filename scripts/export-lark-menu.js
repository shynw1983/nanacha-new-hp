const { mkdirSync, writeFileSync } = require("fs");
const path = require("path");
const menu = require("../menu-data.js");
const homepage = require("../homepage-data.js");
const descriptions = require("../data/menu-descriptions.js");
const categoryNotes = require("../data/category-notes.js");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "lark-import");

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
    categoryNotes[category.id] || "",
    menu.tapiocaFreeCategories.includes(category.id),
    menu.whippedCategories.includes(category.id),
    (index + 1) * 10,
  ]),
];

const drinkRows = [
  [
    "drinkId",
    "name",
    "category",
    "price",
    "description",
    "temperatures",
    "isRecommended",
    "isFeatured",
    "isActive",
    "supportsDecaf",
    "sortOrder",
    "imageFile",
    "imageUrl",
  ],
  ...menu.drinks.map((drink, index) => [
    `drink-${String(index + 1).padStart(2, "0")}`,
    drink.name,
    drink.category,
    drink.price,
    descriptions[drink.name] || "",
    (drink.temperatures || ["ICE"]).join(","),
    recommended.has(drink.name),
    drink.name === "黒糖タピオカミルク",
    true,
    Boolean(drink.supportsDecaf),
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

const homepageSettingsRows = [
  [
    "key",
    "heroEyebrow",
    "heroTitle",
    "heroDescription",
    "primaryButtonLabel",
    "primaryButtonUrl",
    "secondaryButtonLabel",
    "secondaryButtonUrl",
    "seasonEyebrow",
    "seasonTitle",
    "seasonIntro",
    "footerTextLeft",
    "footerTextRight",
    "isActive",
  ],
  [
    "main",
    homepage.settings.heroEyebrow,
    homepage.settings.heroTitle,
    homepage.settings.heroDescription,
    homepage.settings.primaryButtonLabel,
    homepage.settings.primaryButtonUrl,
    homepage.settings.secondaryButtonLabel,
    homepage.settings.secondaryButtonUrl,
    homepage.settings.seasonEyebrow,
    homepage.settings.seasonTitle,
    homepage.settings.seasonIntro,
    homepage.settings.footerTextLeft,
    homepage.settings.footerTextRight,
    true,
  ],
];

const homepageSlidesRows = [
  ["slideId", "title", "caption", "altText", "variant", "sortOrder", "isActive", "imageFile", "imageUrl", "linkUrl"],
  ...homepage.slides.map((slide) => [
    slide.id,
    slide.title,
    slide.caption,
    slide.altText,
    slide.variant,
    slide.sortOrder,
    true,
    slide.imageUrl,
    "",
    slide.linkUrl || "",
  ]),
];

const homepageCardsRows = [
  ["cardId", "section", "badge", "title", "body", "linkedDrinkId", "sortOrder", "isActive"],
  ...homepage.cards.map((card) => [
    card.id,
    card.section,
    card.badge || "",
    card.title,
    card.body,
    card.linkedDrinkId || "",
    card.sortOrder,
    true,
  ]),
];

const storesRows = [
  [
    "storeId",
    "statusLabel",
    "name",
    "summary",
    "storefrontImageFile",
    "storefrontImageUrl",
    "storefrontImageAlt",
    "postalCode",
    "addressRegion",
    "addressLocality",
    "streetAddress",
    "address",
    "intro",
    "hours",
    "openingHoursSchema",
    "closedDays",
    "nearestStation",
    "usage",
    "paymentNote",
    "googleMapsUrl",
    "googleMapsEmbedUrl",
    "uberEatsUrl",
    "phone",
    "isPrimary",
    "sortOrder",
    "isActive",
  ],
  ...homepage.stores.map((store) => [
    store.id,
    store.statusLabel,
    store.name,
    store.summary,
    store.storefrontImageUrl || "",
    "",
    store.storefrontImageAlt || "",
    store.postalCode || "",
    store.addressRegion || "",
    store.addressLocality || "",
    store.streetAddress || "",
    store.address || "",
    store.intro || "",
    store.hours || "",
    store.openingHoursSchema || "",
    store.closedDays || "",
    store.nearestStation || "",
    store.usage || "",
    store.paymentNote || "",
    store.googleMapsUrl || "",
    store.googleMapsEmbedUrl || "",
    store.uberEatsUrl || "",
    store.phone || "",
    Boolean(store.isPrimary),
    store.sortOrder,
    true,
  ]),
];

const faqRows = [
  ["faqId", "question", "answer", "sortOrder", "isActive"],
  ...homepage.faqs.map((faq) => [faq.id, faq.question, faq.answer, faq.sortOrder, true]),
];

mkdirSync(outputDir, { recursive: true });
writeFileSync(path.join(outputDir, "categories.csv"), `${csv(categoryRows)}\n`);
writeFileSync(path.join(outputDir, "drinks.csv"), `${csv(drinkRows)}\n`);
writeFileSync(path.join(outputDir, "menu-settings.csv"), `${csv(settingsRows)}\n`);
writeFileSync(path.join(outputDir, "homepage-settings.csv"), `${csv(homepageSettingsRows)}\n`);
writeFileSync(path.join(outputDir, "homepage-slides.csv"), `${csv(homepageSlidesRows)}\n`);
writeFileSync(path.join(outputDir, "homepage-cards.csv"), `${csv(homepageCardsRows)}\n`);
writeFileSync(path.join(outputDir, "stores.csv"), `${csv(storesRows)}\n`);
writeFileSync(path.join(outputDir, "faq.csv"), `${csv(faqRows)}\n`);

console.log(`Exported Lark import files to ${path.relative(root, outputDir)}/`);
