const siteConfig = require("../data/site-config");

if (!process.env.NEXT_PUBLIC_SITE_URL && !process.env.VERCEL_PROJECT_PRODUCTION_URL) {
  console.warn(
    "NEXT_PUBLIC_SITE_URL is not set. Canonical URLs will fall back to the default Vercel domain until a production URL is configured.",
  );
}

console.log(`Site URL: ${siteConfig.siteUrl}`);
console.log(`OG image: ${siteConfig.ogImagePath}`);
