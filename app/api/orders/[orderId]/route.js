export const dynamic = "force-dynamic";

const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");

export async function GET(request, { params }) {
  const { orderId } = await params;
  const configured = cleanEnv(process.env.FOUNDR1_OS_ORDER_STATUS_API_URL);
  const base =
    configured ||
    `${cleanEnv(process.env.FOUNDR1_OS_BASE_URL || "https://foundr1.jp").replace(/\/$/, "")}/api/public/orders/status`;
  const url = new URL(base);
  url.searchParams.set("orderId", orderId);
  const requestUrl = new URL(request.url);
  if (requestUrl.searchParams.get("pickupDate")) url.searchParams.set("pickupDate", requestUrl.searchParams.get("pickupDate"));
  const osResponse = await fetch(url, { cache: "no-store" });
  const body = await osResponse.json().catch(() => ({}));
  return Response.json(body, { status: osResponse.status, headers: { "Cache-Control": "no-store" } });
}
