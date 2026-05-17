const { getMenuData } = require("../../../api/menu-source");

export async function GET(request) {
  const store = new URL(request.url).searchParams.get("store") || "";
  return Response.json(await getMenuData(store), {
    headers: {
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
    },
  });
}
