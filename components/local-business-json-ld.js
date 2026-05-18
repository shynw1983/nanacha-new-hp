import siteConfig from "../data/site-config";
import siteLinks from "../data/site-links";

const cleanPostalCode = (value = "") => String(value).replace(/^〒/, "");

const getAddressParts = (store) => {
  if (store.id === "kiyokawa") {
    return {
      streetAddress: "清川2-9-6",
      addressLocality: "福岡市中央区",
      addressRegion: "福岡県",
    };
  }

  return {
    streetAddress: store.address,
  };
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
      ...getAddressParts(store),
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
