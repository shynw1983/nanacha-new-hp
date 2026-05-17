const { getHomepageData } = require("../../../api/homepage-source");

export async function GET() {
  return Response.json(await getHomepageData(), {
    headers: {
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
    },
  });
}
