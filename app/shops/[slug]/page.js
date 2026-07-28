import { notFound } from "next/navigation";
const { getHomepageData } = require("../../../server/homepage-source");
const { getMenuData } = require("../../../server/menu-source");
import { LocalBusinessJsonLd } from "../../../components/local-business-json-ld";
import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";
import { StorePageContent } from "../../../components/store-page-content";
import siteConfig from "../../../data/site-config";
const { languageAlternates } = require("../../../data/locales");

const findStore = (stores, slug) => stores.find((store) => store.id === slug && store.address);

export async function generateStaticParams() {
  const homepage = await getHomepageData();
  return homepage.stores.filter((store) => store.address).map((store) => ({ slug: store.id }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const homepage = await getHomepageData();
  const store = findStore(homepage.stores, slug);

  if (!store) {
    return {};
  }

  const title = `${store.name} | nanacha`;
  const description = `${store.name}の店舗情報とWeb予約。商品を選び、カスタマイズして受け取り注文ができます。`;

  return {
    title,
    description,
    alternates: {
      canonical: `/shops/${store.id}`,
      languages: languageAlternates(`/shops/${store.id}`),
    },
    openGraph: {
      title,
      description,
      url: `/shops/${store.id}`,
    },
  };
}

export const dynamicParams = false;

export default async function StorePage({ params }) {
  const { slug } = await params;
  const homepage = await getHomepageData();
  const store = findStore(homepage.stores, slug);

  if (!store) {
    notFound();
  }
  const menu = await getMenuData(store.id);

  return (
    <>
      <LocalBusinessJsonLd store={store} url={`${siteConfig.siteUrl}/shops/${store.id}`} />
      <SiteHeader shops reservationHref="#order-menu" />
      <StorePageContent store={store} menu={menu} />
      <SiteFooter />
    </>
  );
}
