const localMenu = require("../menu-data.js");
const publishedMenu = require("../published/menu.json");
const localDrinkDescriptions = require("../data/menu-descriptions.js");
const localCategoryNotes = require("../data/category-notes.js");
const { getProductCatalogMenu } = require("./product-catalog");

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

const getMenuData = async (storeId = "", options = {}) => {
  const menu = await getProductCatalogMenu(storeId, options);

  if (!storeId) {
    return menu;
  }

  if (menu.source === "foundr1-os") {
    return {
      ...menu,
      selectedStoreId: storeId,
      drinks: menu.drinks.filter((drink) => drink.websiteEnabled !== false && drink.isAvailable !== false),
    };
  }

  return publishedMenu.storeMenus?.[storeId] || {
    ...menu,
    selectedStoreId: storeId,
    drinks: [],
  };
};

const getLiveMenuData = getMenuData;

module.exports = {
  getMenuData,
  getLiveMenuData,
  fallbackMenu,
  localMenu,
};
