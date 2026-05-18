const siteConfig = require("../data/site-config");
const { getHomepageData } = require("../server/homepage-source");
const { translatedLocales, withLocalePath } = require("../data/locales");

export default async function sitemap() {
  const homepage = await getHomepageData();
  const storeEntries = homepage.stores
    .filter((store) => store.address)
    .map((store) => ({
      url: `${siteConfig.siteUrl}/shops/${store.id}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    }));
  const localizedEntries = translatedLocales.flatMap((locale) =>
    [
      { path: "/", changeFrequency: "weekly", priority: 1 },
      { path: "/menu", changeFrequency: "weekly", priority: 0.8 },
      { path: "/shops", changeFrequency: "monthly", priority: 0.8 },
    ].map((entry) => ({
      url: `${siteConfig.siteUrl}${withLocalePath(locale, entry.path)}`,
      lastModified: new Date(),
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    })),
  );
  const localizedStoreEntries = translatedLocales.flatMap((locale) =>
    homepage.stores
      .filter((store) => store.address)
      .map((store) => ({
        url: `${siteConfig.siteUrl}${withLocalePath(locale, `/shops/${store.id}`)}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.7,
      })),
  );

  return [
    {
      url: siteConfig.siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteConfig.siteUrl}/menu`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteConfig.siteUrl}/shops`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...storeEntries,
    ...localizedEntries,
    ...localizedStoreEntries,
  ];
}
