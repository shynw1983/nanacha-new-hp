const siteConfig = require("../data/site-config");

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`,
  };
}
