import siteConfig from "../data/site-config";
import siteLinks from "../data/site-links";

const cleanPostalCode = (value = "") => String(value).replace(/^〒/, "");

const parseOpeningHours = (value = "") => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

export function LocalBusinessJsonLd({ store, url = siteConfig.siteUrl }) {
  if (!store) {
    return null;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: `${siteConfig.name} ${store.name}`,
    url,
    image: [`${siteConfig.siteUrl}${siteConfig.ogImagePath}`],
    address: {
      "@type": "PostalAddress",
      streetAddress: store.streetAddress || store.address,
      addressLocality: store.addressLocality || undefined,
      addressRegion: store.addressRegion || undefined,
      postalCode: cleanPostalCode(store.postalCode),
      addressCountry: "JP",
    },
    sameAs: [siteLinks.instagram],
    hasMenu: `${siteConfig.siteUrl}/menu`,
    telephone: store.phone || undefined,
    openingHoursSpecification: parseOpeningHours(store.openingHoursSchema),
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
