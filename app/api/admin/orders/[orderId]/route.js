import { cookies } from "next/headers";

const { findOrder, updateOrder } = require("../../../../../server/orders");
const { getSessionFromCookieStore, hasStoreAccess } = require("../../../../../server/admin-auth");
const { publishOrderEvent } = require("../../../../../server/realtime");

const allowedStatuses = new Set(["new", "preparing", "ready", "completed", "cancelled", "payment_failed"]);

export async function PATCH(request, { params }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;
  const body = await request.json().catch(() => ({}));
  const status = String(body.status || "");

  if (!allowedStatuses.has(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = await findOrder((item) => item.orderId === orderId);
  if (!order) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (!hasStoreAccess(session, order.storeId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const updatedOrder = await updateOrder(order, { status });
  await publishOrderEvent("order.updated", updatedOrder);
  return Response.json({ order: updatedOrder });
}
