const foundr1BaseUrl = () => {
  const value = process.env.FOUNDR1_OS_BASE_URL || process.env.NEXT_PUBLIC_FOUNDR1_API_BASE_URL || "https://foundr1.jp";
  return String(value).trim().replace(/\/$/, "");
};

export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const memberToken = url.searchParams.get("memberToken") || "";
  const brand = url.searchParams.get("brand") || "";
  if (!token && !memberToken) return Response.json({ error: "会員ログイン情報がありません。" }, { status: 400 });

  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (memberToken) params.set("memberToken", memberToken);
  if (brand) params.set("brand", brand);
  const response = await fetch(`${foundr1BaseUrl()}/api/public/members/handoff?${params.toString()}`, {
    cache: "no-store"
  });
  const body = await response.json().catch(() => ({}));
  return Response.json(body, {
    status: response.status,
    headers: { "Cache-Control": "no-store" }
  });
}
