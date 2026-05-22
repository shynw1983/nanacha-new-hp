import { notFound } from "next/navigation";
const { getMenuData } = require("../../server/menu-source");
const { getHomepageData } = require("../../server/homepage-source");
import { HomeContent } from "../../components/home-content";
import { LocalizedShell } from "../../components/localized-shell";
import { LocalBusinessJsonLd } from "../../components/local-business-json-ld";
import { ReservationForm } from "../../components/reservation-form";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import siteConfig from "../../data/site-config";
const { languageAlternates, translatedLocales, withLocalePath } = require("../../data/locales");

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return translatedLocales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  if (!translatedLocales.includes(lang)) return {};

  return {
    title: siteConfig.title,
    description: siteConfig.description,
    alternates: {
      canonical: withLocalePath(lang, "/"),
      languages: languageAlternates("/"),
    },
    openGraph: {
      title: siteConfig.title,
      description: siteConfig.description,
      url: withLocalePath(lang, "/"),
    },
  };
}

export default async function LocalizedHomePage({ params }) {
  const { lang } = await params;
  if (!translatedLocales.includes(lang)) notFound();

  const [menu, homepage] = await Promise.all([getMenuData(), getHomepageData()]);
  const primaryStore = homepage.stores.find((store) => store.isPrimary && store.address) || homepage.stores.find((store) => store.address);

  return (
    <LocalizedShell language={lang}>
      <LocalBusinessJsonLd store={primaryStore} url={`${siteConfig.siteUrl}${withLocalePath(lang, "/")}`} />
      <SiteHeader />
      <main id="top">
        <HomeContent homepage={homepage} menu={menu} />
        <ReservationForm initialMenu={menu} stores={homepage.stores} />
      </main>
      <SiteFooter />
    </LocalizedShell>
  );
}
