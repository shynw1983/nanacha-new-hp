const { getMenuData } = require("../../../server/menu-source");

const brandMenuCacheHeader = "s-maxage=300, stale-while-revalidate=3600";
const storeMenuCacheHeader = "no-store, max-age=0";

export async function GET(request) {
  const store = new URL(request.url).searchParams.get("store") || "";
  return Response.json(await getMenuData(store, store ? { noStore: true } : {}), {
    headers: {
      "Cache-Control": store ? storeMenuCacheHeader : brandMenuCacheHeader,
    },
  });
}
