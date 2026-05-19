const { findOrder } = require("../../../../server/orders");
const { toPublicOrder } = require("../../../../server/realtime");

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const { orderId } = await params;
  const order = await findOrder((item) => item.orderId === orderId);
  if (!order) {
    return Response.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ order: toPublicOrder(order) }, { headers: { "Cache-Control": "no-store" } });
}
