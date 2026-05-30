export const dynamic = "force-dynamic";

const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");

export async function GET() {
  const configured = cleanEnv(process.env.FOUNDR1_OS_ORDER_REALTIME_API_URL);
  const base =
    configured ||
    `${cleanEnv(process.env.FOUNDR1_OS_BASE_URL || "https://foundr1.jp").replace(/\/$/, "")}/api/public/orders/realtime-config`;
  const response = await fetch(base, { cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  return Response.json(body, { status: response.status, headers: { "Cache-Control": "no-store" } });
}
