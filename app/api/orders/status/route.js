const { findPublicOrder } = require("../../../../server/public-orders");

export const dynamic = "force-dynamic";

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const order = await findPublicOrder({
    orderId: params.get("orderId"),
    pickupCode: params.get("pickupCode"),
    pickupDate: params.get("pickupDate"),
  });

  if (!order) {
    return Response.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ order }, { headers: { "Cache-Control": "no-store" } });
}
