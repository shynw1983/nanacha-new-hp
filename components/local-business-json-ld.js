import siteConfig from "../data/site-config";
import siteLinks from "../data/site-links";

const cleanPostalCode = (value = "") => String(value).replace(/^〒/, "");

export function LocalBusinessJsonLd({ store }) {
  if (!store) {
    return null;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: `${siteConfig.name} ${store.name}`,
    url: siteConfig.siteUrl,
    image: [`${siteConfig.siteUrl}${siteConfig.ogImagePath}`],
    address: {
      "@type": "PostalAddress",
      streetAddress: "清川2-9-6",
      addressLocality: "福岡市中央区",
      addressRegion: "福岡県",
      postalCode: cleanPostalCode(store.postalCode),
      addressCountry: "JP",
    },
    sameAs: [siteLinks.instagram],
    hasMenu: `${siteConfig.siteUrl}/menu`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}
