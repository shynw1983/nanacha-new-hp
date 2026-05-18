import { notFound } from "next/navigation";
const { getHomepageData } = require("../../../server/homepage-source");
import { LocalizedShell } from "../../../components/localized-shell";
import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";
import { StoreListContent } from "../../../components/store-list-content";
const { languageAlternates, translatedLocales, withLocalePath } = require("../../../data/locales");

export function generateStaticParams() {
  return translatedLocales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  if (!translatedLocales.includes(lang)) return {};

  return {
    title: "店舗一覧 | nanacha",
    alternates: {
      canonical: withLocalePath(lang, "/shops"),
      languages: languageAlternates("/shops"),
    },
    openGraph: {
      title: "店舗一覧 | nanacha",
      url: withLocalePath(lang, "/shops"),
    },
  };
}

export default async function LocalizedShopsPage({ params }) {
  const { lang } = await params;
  if (!translatedLocales.includes(lang)) notFound();
  const homepage = await getHomepageData();

  return (
    <LocalizedShell language={lang}>
      <SiteHeader shops />
      <StoreListContent stores={homepage.stores} />
      <SiteFooter />
    </LocalizedShell>
  );
}
