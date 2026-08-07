export const dynamic = "force-dynamic";

const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");

export async function GET(request) {
  const storeId = String(new URL(request.url).searchParams.get("storeId") || "").trim();
  const baseUrl = cleanEnv(process.env.FOUNDR1_OS_BASE_URL || "https://foundr1.jp").replace(/\/$/, "");
  const response = await fetch(
    `${baseUrl}/api/public/orders/realtime-config?storeId=${encodeURIComponent(storeId)}`,
    { cache: "no-store" },
  );
  const body = await response.json().catch(() => ({}));
  return Response.json(body, { status: response.status, headers: { "Cache-Control": "no-store" } });
}
