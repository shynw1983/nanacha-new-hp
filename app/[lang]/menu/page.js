import { notFound } from "next/navigation";
const { getMenuData } = require("../../../server/menu-source");
import { LocalizedShell } from "../../../components/localized-shell";
import { MenuBrowser } from "../../../components/menu-browser";
import { MenuInfo, MenuIntro } from "../../../components/menu-static-content";
import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";
const { languageAlternates, translatedLocales, withLocalePath } = require("../../../data/locales");

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return translatedLocales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  if (!translatedLocales.includes(lang)) return {};

  return {
    title: "メニュー | nanacha",
    alternates: {
      canonical: withLocalePath(lang, "/menu"),
      languages: languageAlternates("/menu"),
    },
    openGraph: {
      title: "メニュー | nanacha",
      url: withLocalePath(lang, "/menu"),
    },
  };
}

export default async function LocalizedMenuPage({ params }) {
  const { lang } = await params;
  if (!translatedLocales.includes(lang)) notFound();
  const menu = await getMenuData();

  return (
    <LocalizedShell language={lang}>
      <SiteHeader menu />
      <main>
        <MenuIntro />
        <MenuBrowser initialMenu={menu} />
        <MenuInfo />
      </main>
      <SiteFooter />
    </LocalizedShell>
  );
}
