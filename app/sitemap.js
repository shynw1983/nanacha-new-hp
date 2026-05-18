const siteConfig = require("../data/site-config");
const { getHomepageData } = require("../server/homepage-source");

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
  ];
}
