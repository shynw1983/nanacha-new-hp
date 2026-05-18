import { notFound } from "next/navigation";
const { getHomepageData } = require("../../../../server/homepage-source");
import { LocalizedShell } from "../../../../components/localized-shell";
import { LocalBusinessJsonLd } from "../../../../components/local-business-json-ld";
import { SiteFooter } from "../../../../components/site-footer";
import { SiteHeader } from "../../../../components/site-header";
import { StorePageContent } from "../../../../components/store-page-content";
import siteConfig from "../../../../data/site-config";
const { languageAlternates, translatedLocales, withLocalePath } = require("../../../../data/locales");

const findStore = (stores, slug) => stores.find((store) => store.id === slug && store.address);

export async function generateStaticParams() {
  const homepage = await getHomepageData();
  return translatedLocales.flatMap((lang) =>
    homepage.stores.filter((store) => store.address).map((store) => ({ lang, slug: store.id })),
  );
}

export async function generateMetadata({ params }) {
  const { lang, slug } = await params;
  const homepage = await getHomepageData();
  const store = findStore(homepage.stores, slug);

  if (!translatedLocales.includes(lang) || !store) return {};

  return {
    title: `${store.name} | nanacha`,
    alternates: {
      canonical: withLocalePath(lang, `/shops/${store.id}`),
      languages: languageAlternates(`/shops/${store.id}`),
    },
    openGraph: {
      title: `${store.name} | nanacha`,
      url: withLocalePath(lang, `/shops/${store.id}`),
    },
  };
}

export const dynamicParams = false;

export default async function LocalizedStorePage({ params }) {
  const { lang, slug } = await params;
  if (!translatedLocales.includes(lang)) notFound();
  const homepage = await getHomepageData();
  const store = findStore(homepage.stores, slug);
  if (!store) notFound();

  return (
    <LocalizedShell language={lang}>
      <LocalBusinessJsonLd
        store={store}
        url={`${siteConfig.siteUrl}${withLocalePath(lang, `/shops/${store.id}`)}`}
      />
      <SiteHeader shops />
      <StorePageContent store={store} />
      <SiteFooter />
    </LocalizedShell>
  );
}
