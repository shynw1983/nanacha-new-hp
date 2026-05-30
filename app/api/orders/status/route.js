export const dynamic = "force-dynamic";

const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");

const getOsStatusUrl = (params) => {
  const configured = cleanEnv(process.env.FOUNDR1_OS_ORDER_STATUS_API_URL);
  const base =
    configured ||
    `${cleanEnv(process.env.FOUNDR1_OS_BASE_URL || "https://foundr1.jp").replace(/\/$/, "")}/api/public/orders/status`;
  const url = new URL(base);
  for (const [key, value] of params.entries()) {
    if (value) url.searchParams.set(key, value);
  }
  return url;
};

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const osResponse = await fetch(getOsStatusUrl(params), { cache: "no-store" });
  const body = await osResponse.json().catch(() => ({}));
  return Response.json(body, { status: osResponse.status, headers: { "Cache-Control": "no-store" } });
}
