const { getMenuData } = require("../../server/menu-source");
const { getBrandSiteSections } = require("../../server/brand-site-source");
import { MenuBrowser } from "../../components/menu-browser";
import { MenuInfo, MenuIntro } from "../../components/menu-static-content";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
const { languageAlternates } = require("../../data/locales");

export const dynamic = "force-dynamic";

export const metadata = {
  title: "メニュー | nanacha 福岡清川店｜タピオカ・ミルクティー・スムージー",
  description:
    "nanacha 福岡清川店のメニュー。黒糖タピオカミルク、タピオカフラッペ、チーズティー、スムージー、八女抹茶ラテ、ティー、コーヒーの価格とカスタマイズ。",
  alternates: {
    canonical: "/menu",
    languages: languageAlternates("/menu"),
  },
  openGraph: {
    title: "メニュー | nanacha 福岡清川店｜タピオカ・ミルクティー・スムージー",
    description:
      "nanacha 福岡清川店のメニュー。黒糖タピオカミルク、タピオカフラッペ、チーズティー、スムージー、八女抹茶ラテ、ティー、コーヒーの価格とカスタマイズ。",
    url: "/menu",
  },
};

export default async function MenuPage() {
  const [menu, siteSections] = await Promise.all([getMenuData(), getBrandSiteSections("nanacha", "ja")]);

  return (
    <>
      <SiteHeader menu />
      <main>
        <MenuIntro sections={siteSections} />
        <MenuBrowser initialMenu={menu} />
        <MenuInfo sections={siteSections} />
      </main>
      <SiteFooter sections={siteSections} />
    </>
  );
}
