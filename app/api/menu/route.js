const { getMenuData } = require("../../../server/menu-source");

export async function GET(request) {
  const store = new URL(request.url).searchParams.get("store") || "";
  return Response.json(await getMenuData(store), {
    headers: {
      "Cache-Control": store ? "no-store" : "s-maxage=60, stale-while-revalidate=300",
    },
  });
}
