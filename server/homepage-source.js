const homepageFallback = require("../homepage-data.js");
const publishedHomepage = require("../published/homepage.json");
const {
  cleanEnv,
  textValue,
  booleanValue,
  imageValue,
  getTenantAccessToken,
  fetchAllRecords,
} = require("./lark-utils");

const sortByOrder = (items = []) =>
  [...items].sort((a, b) => (a.sortOrder || 9999) - (b.sortOrder || 9999));

const mergeWithFallbackStore = (store) => {
  const fallbackStore = homepageFallback.stores.find((item) => item.id === store.id);

  if (!fallbackStore) {
    return store;
  }

  return Object.fromEntries(
    Object.entries({
      ...fallbackStore,
      ...store,
    }).map(([key, value]) => [key, value || fallbackStore[key] || value]),
  );
};

const normalizeLegacyHomepageSetting = (key, value) => {
  if (key === "primaryButtonUrl" && value === "menu.html") {
    return "/menu";
  }

  if (
    key === "heroDescription" &&
    value ===
      "黒糖タピオカミルク、フルーツティー、八女抹茶ラテ、スムージーまで。素材の香りと選ぶ楽しさを大切にした、気軽に立ち寄れるティースタンドです。"
  ) {
    return "2019年12月に福岡で誕生した nanacha は、黒糖タピオカミルク、フルーツティー、八女抹茶ラテ、スムージーまで、素材の香りと選ぶ楽しさを大切にした、気軽に立ち寄れるティースタンドです。";
  }

  return value;
};

const normalizeHomepage = ({
  settingsRecords = [],
  slideRecords = [],
  cardRecords = [],
  storeRecords = [],
  faqRecords = [],
} = {}) => {
  const settings = settingsRecords
    .map((record) => record.fields || {})
    .find((fields) => booleanValue(fields.isActive)) || {};

  const slides = sortByOrder(
    slideRecords
      .map((record) => record.fields || {})
      .filter(
        (fields) =>
          booleanValue(fields.isActive) &&
          (textValue(fields.imageFile) || textValue(fields.imageUrl) || imageValue(fields.image)),
      )
      .map((fields) => ({
        id: textValue(fields.slideId),
        title: textValue(fields.title),
        caption: textValue(fields.caption),
        imageUrl: textValue(fields.imageFile) || textValue(fields.imageUrl) || imageValue(fields.image),
        altText: textValue(fields.altText),
        variant: textValue(fields.variant) || "photo",
        linkUrl: textValue(fields.linkUrl),
        sortOrder: Number(fields.sortOrder) || 9999,
      })),
  );

  const cards = sortByOrder(
    cardRecords
      .map((record) => record.fields || {})
      .filter((fields) => booleanValue(fields.isActive) && fields.section && fields.title)
      .map((fields) => ({
        id: textValue(fields.cardId),
        section: textValue(fields.section),
        badge: textValue(fields.badge),
        title: textValue(fields.title),
        body: textValue(fields.body),
        linkedDrinkId: textValue(fields.linkedDrinkId),
        sortOrder: Number(fields.sortOrder) || 9999,
      })),
  );

  const stores = sortByOrder(
    storeRecords
      .map((record) => record.fields || {})
      .filter((fields) => booleanValue(fields.isActive) && fields.name)
      .map((fields) =>
        mergeWithFallbackStore({
          id: textValue(fields.storeId),
          statusLabel: textValue(fields.statusLabel),
          name: textValue(fields.name),
          summary: textValue(fields.summary),
          storefrontImageUrl: textValue(fields.storefrontImageFile) || textValue(fields.storefrontImageUrl) || imageValue(fields.storefrontImage),
          storefrontImageAlt: textValue(fields.storefrontImageAlt),
        postalCode: textValue(fields.postalCode),
        addressRegion: textValue(fields.addressRegion),
        addressLocality: textValue(fields.addressLocality),
        streetAddress: textValue(fields.streetAddress),
        address: textValue(fields.address),
          intro: textValue(fields.intro),
        hours: textValue(fields.hours),
        openingHoursSchema: textValue(fields.openingHoursSchema),
          closedDays: textValue(fields.closedDays),
          nearestStation: textValue(fields.nearestStation),
          usage: textValue(fields.usage),
          paymentNote: textValue(fields.paymentNote),
          googleMapsUrl: textValue(fields.googleMapsUrl),
          googleMapsEmbedUrl: textValue(fields.googleMapsEmbedUrl),
        uberEatsUrl: textValue(fields.uberEatsUrl),
        phone: textValue(fields.phone),
        isPrimary: booleanValue(fields.isPrimary),
          sortOrder: Number(fields.sortOrder) || 9999,
        }),
      ),
  );

  const faqs = sortByOrder(
    faqRecords
      .map((record) => record.fields || {})
      .filter((fields) => booleanValue(fields.isActive) && fields.question && fields.answer)
      .map((fields) => ({
        id: textValue(fields.faqId),
        question: textValue(fields.question),
        answer: textValue(fields.answer),
        sortOrder: Number(fields.sortOrder) || 9999,
      })),
  );

  return {
    settings: {
      ...homepageFallback.settings,
      ...Object.fromEntries(
        Object.entries(settings).map(([key, value]) => [key, normalizeLegacyHomepageSetting(key, textValue(value))]),
      ),
    },
    slides: slides.length ? slides : homepageFallback.slides,
    cards: cards.length ? cards : homepageFallback.cards,
    stores: stores.length ? stores : homepageFallback.stores,
    faqs: faqs.length ? faqs : homepageFallback.faqs,
  };
};

const fetchLarkHomepage = async (token) => {
  if (!token) {
    return null;
  }

  const [settingsRecords, slideRecords, cardRecords, storeRecords, faqRecords] = await Promise.all([
    fetchAllRecords(
      token,
      cleanEnv(process.env.LARK_HOMEPAGE_SETTINGS_TABLE_ID),
      cleanEnv(process.env.LARK_HOMEPAGE_BASE_APP_TOKEN),
    ),
    fetchAllRecords(
      token,
      cleanEnv(process.env.LARK_HOMEPAGE_SLIDES_TABLE_ID),
      cleanEnv(process.env.LARK_HOMEPAGE_BASE_APP_TOKEN),
    ),
    fetchAllRecords(
      token,
      cleanEnv(process.env.LARK_HOMEPAGE_CARDS_TABLE_ID),
      cleanEnv(process.env.LARK_HOMEPAGE_BASE_APP_TOKEN),
    ),
    fetchAllRecords(
      token,
      cleanEnv(process.env.LARK_STORES_TABLE_ID),
      cleanEnv(process.env.LARK_HOMEPAGE_BASE_APP_TOKEN),
    ),
    fetchAllRecords(
      token,
      cleanEnv(process.env.LARK_FAQ_TABLE_ID),
      cleanEnv(process.env.LARK_HOMEPAGE_BASE_APP_TOKEN),
    ),
  ]);

  return normalizeHomepage({
    settingsRecords,
    slideRecords,
    cardRecords,
    storeRecords,
    faqRecords,
  });
};

const getLiveHomepageData = async () => {
  const token = await getTenantAccessToken();

  if (!token) {
    throw new Error("Lark is not configured.");
  }

  return await fetchLarkHomepage(token);
};

const getHomepageData = async () => publishedHomepage || homepageFallback;

module.exports = {
  getHomepageData,
  getLiveHomepageData,
  homepageFallback,
};
