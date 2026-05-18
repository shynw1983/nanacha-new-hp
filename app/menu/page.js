const { getMenuData } = require("../../server/menu-source");
import { MenuBrowser } from "../../components/menu-browser";
import { MenuInfo, MenuIntro } from "../../components/menu-static-content";
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";

export const metadata = {
  title: "メニュー | nanacha 福岡清川店｜タピオカ・ミルクティー・スムージー",
  description:
    "nanacha 福岡清川店のメニュー。黒糖タピオカミルク、タピオカフラッペ、チーズティー、スムージー、八女抹茶ラテ、ティー、コーヒーの価格とカスタマイズ。",
  alternates: {
    canonical: "/menu",
  },
  openGraph: {
    title: "メニュー | nanacha 福岡清川店｜タピオカ・ミルクティー・スムージー",
    description:
      "nanacha 福岡清川店のメニュー。黒糖タピオカミルク、タピオカフラッペ、チーズティー、スムージー、八女抹茶ラテ、ティー、コーヒーの価格とカスタマイズ。",
    url: "/menu",
  },
};

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const menu = await getMenuData();

  return (
    <>
      <SiteHeader menu />
      <main>
        <MenuIntro />
        <MenuBrowser initialMenu={menu} />
        <MenuInfo />
      </main>
      <SiteFooter />
    </>
  );
}
