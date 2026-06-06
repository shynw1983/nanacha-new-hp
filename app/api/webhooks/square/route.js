import { createHmac, timingSafeEqual } from "crypto";

const { findOrder, updateOrder } = require("../../../../server/orders");
const { publishOrderEvent } = require("../../../../server/realtime");

const verifySignature = (rawBody, signature) => {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "";
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL || "";

  if (!key || !notificationUrl || !signature) {
    return false;
  }

  const expected = createHmac("sha256", key).update(`${notificationUrl}${rawBody}`).digest("base64");

  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature") || "";

  if (!verifySignature(rawBody, signature)) {
    return Response.json({ error: "Invalid signature" }, { status: 403 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!["payment.created", "payment.updated"].includes(event.type)) {
    return Response.json({ ok: true });
  }

  const payment = event.data?.object?.payment;
  const squareOrderId = payment?.order_id;

  if (!squareOrderId) {
    return Response.json({ ok: true });
  }

  const order = await findOrder((item) => item.squareOrderId === squareOrderId);

  if (!order) {
    return Response.json({ ok: true });
  }

  if (payment.status === "COMPLETED") {
    const updatedOrder = await updateOrder(order, {
      status: order.status === "pending_payment" ? "new" : order.status,
      paymentStatus: "paid",
      squarePaymentId: payment.id || "",
      squareReceiptUrl: payment.receipt_url || "",
      squarePaymentUpdatedAt: payment.updated_at || payment.created_at || new Date().toISOString(),
      paidAt: payment.updated_at || payment.created_at || new Date().toISOString(),
    });
    await publishOrderEvent("order.created", updatedOrder);
  } else if (["FAILED", "CANCELED"].includes(payment.status)) {
    const updatedOrder = await updateOrder(order, {
      status: "payment_failed",
      paymentStatus: payment.status.toLowerCase(),
      squarePaymentId: payment.id || "",
      squareReceiptUrl: payment.receipt_url || "",
      squarePaymentUpdatedAt: payment.updated_at || payment.created_at || new Date().toISOString(),
    });
    await publishOrderEvent("order.updated", updatedOrder);
  }

  return Response.json({ ok: true });
}
