const { getMenuData } = require("../../../server/menu-source");

const brandMenuCacheHeader = "s-maxage=300, stale-while-revalidate=3600";
const storeMenuCacheHeader = "s-maxage=15, stale-while-revalidate=60";

export async function GET(request) {
  const store = new URL(request.url).searchParams.get("store") || "";
  return Response.json(await getMenuData(store), {
    headers: {
      "Cache-Control": store ? storeMenuCacheHeader : brandMenuCacheHeader,
    },
  });
}
