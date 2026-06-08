const { getMenuData } = require("../server/menu-source");
const { getHomepageData } = require("../server/homepage-source");
const { getBrandSiteSections } = require("../server/brand-site-source");
import { HomeContent } from "../components/home-content";
import { LocalBusinessJsonLd } from "../components/local-business-json-ld";
import { ReservationForm } from "../components/reservation-form";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";
import siteConfig from "../data/site-config";
const { languageAlternates } = require("../data/locales");

export const dynamic = "force-dynamic";

export const metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  alternates: {
    canonical: "/",
    languages: languageAlternates("/"),
  },
};

export default async function HomePage() {
  const [menu, homepage, siteSections] = await Promise.all([getMenuData(), getHomepageData("ja"), getBrandSiteSections("nanacha", "ja")]);
  const primaryStore = homepage.stores.find((store) => store.isPrimary && store.address) || homepage.stores.find((store) => store.address);

  return (
    <>
      <LocalBusinessJsonLd store={primaryStore} />
      <SiteHeader />
      <main id="top">
        <HomeContent homepage={homepage} menu={menu} />
        <ReservationForm initialMenu={menu} stores={homepage.stores} />
      </main>
      <SiteFooter sections={siteSections} />
    </>
  );
}
