const { getHomepageData } = require("../../server/homepage-source");
import { SiteFooter } from "../../components/site-footer";
import { SiteHeader } from "../../components/site-header";
import { StoreListContent } from "../../components/store-list-content";
const { languageAlternates } = require("../../data/locales");

export const metadata = {
  title: "店舗一覧 | nanacha",
  description: "nanacha の店舗一覧。各店舗の住所、営業時間、アクセス、受け取り方法をご案内します。",
  alternates: {
    canonical: "/shops",
    languages: languageAlternates("/shops"),
  },
  openGraph: {
    title: "店舗一覧 | nanacha",
    description: "nanacha の店舗一覧。各店舗の住所、営業時間、アクセス、受け取り方法をご案内します。",
    url: "/shops",
  },
};

export default async function ShopsPage() {
  const homepage = await getHomepageData();

  return (
    <>
      <SiteHeader shops />
      <StoreListContent stores={homepage.stores} />
      <SiteFooter />
    </>
  );
}
