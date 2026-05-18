import { notFound } from "next/navigation";
const { getHomepageData } = require("../../../server/homepage-source");
import { LocalBusinessJsonLd } from "../../../components/local-business-json-ld";
import { SiteFooter } from "../../../components/site-footer";
import { SiteHeader } from "../../../components/site-header";
import { StorePageContent } from "../../../components/store-page-content";
import siteConfig from "../../../data/site-config";

const findStore = (stores, slug) => stores.find((store) => store.id === slug && store.address);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const homepage = await getHomepageData();
  const store = findStore(homepage.stores, slug);

  if (!store) {
    return {};
  }

  const title = `${store.name} | nanacha`;
  const description = `${store.name}の店舗情報。${store.address}。営業時間、アクセス、受け取り方法をご案内します。`;

  return {
    title,
    description,
    alternates: {
      canonical: `/shops/${store.id}`,
    },
    openGraph: {
      title,
      description,
      url: `/shops/${store.id}`,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function StorePage({ params }) {
  const { slug } = await params;
  const homepage = await getHomepageData();
  const store = findStore(homepage.stores, slug);

  if (!store) {
    notFound();
  }

  return (
    <>
      <LocalBusinessJsonLd store={store} url={`${siteConfig.siteUrl}/shops/${store.id}`} />
      <SiteHeader shops />
      <StorePageContent store={store} />
      <SiteFooter />
    </>
  );
}
