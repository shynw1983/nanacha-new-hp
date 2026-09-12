// Catalog text is resolved as a whole field from the OS menu master.
const displayText = (record, language = "ja", field = "name", translations = "displayNames") => {
  const source = String(record?.[field] || "").trim();
  const names = record?.[translations] || {};
  return language === "ja" ? source || names.ja || names.en || "" : names[language] || names.en || source;
};

const localizeMenu = (menu, language) => ({
  ...menu,
  categories: menu.categories.map((category) => ({
    ...category,
    label: displayText(category, language, "label"),
    note: displayText(category, language, "note", "noteDisplayNames"),
  })),
  drinks: menu.drinks.map((item) => ({
    ...item,
    name: displayText(item, language),
    description: displayText(item, language, "description", "descriptionDisplayNames"),
  })),
});

const usesProductCustomizations = (item) => item?.productType === "food" || item?.usesStructuredCustomizations === true;
const isOrderable = (item) => !!item && item.priceConfigured !== false && item.isAvailable !== false && item.websiteEnabled !== false;

module.exports = { displayText, localizeMenu, usesProductCustomizations, isOrderable };
