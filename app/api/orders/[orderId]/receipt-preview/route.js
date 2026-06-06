export const dynamic = "force-dynamic";

const cleanEnv = (value = "") => String(value).trim().replace(/^["\x27]|["\x27]$/g, "");

const foundr1BaseUrl = () => {
  const configured = cleanEnv(process.env.FOUNDR1_OS_BASE_URL || process.env.NEXT_PUBLIC_FOUNDR1_API_BASE_URL || "");
  return (configured || "https://foundr1.jp").replace(/\/$/, "");
};

export async function GET(request, { params }) {
  const { searchParams } = new URL(request.url);
  const pickupCode = searchParams.get("pickupCode") || "";
  const target = new URL("/public/orders/receipt/preview", foundr1BaseUrl());
  target.searchParams.set("orderId", params.orderId);
  if (pickupCode) target.searchParams.set("pickupCode", pickupCode);
  return Response.redirect(target, 302);
}
