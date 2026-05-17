const { getMenuData } = require("../server/menu-source");
const { getHomepageData } = require("../server/homepage-source");
import { HomeContent } from "../components/home-content";
import { ReservationForm } from "../components/reservation-form";
import { SiteFooter } from "../components/site-footer";
import { SiteHeader } from "../components/site-header";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [menu, homepage] = await Promise.all([getMenuData(), getHomepageData()]);

  return (
    <>
      <SiteHeader />
      <main id="top">
        <HomeContent homepage={homepage} menu={menu} />
        <ReservationForm initialMenu={menu} />
      </main>
      <SiteFooter />
    </>
  );
}
