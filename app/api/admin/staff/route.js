import { cookies } from "next/headers";

const { listAdminUsers, createAdminUser } = require("../../../../server/admin-users");
const { getSessionFromCookieStore, canManageStaff } = require("../../../../server/admin-auth");

export async function GET() {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageStaff(session)) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json({ users: await listAdminUsers() });
}

export async function POST(request) {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageStaff(session)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const user = await createAdminUser({
    loginId: String(body.loginId || "").trim(),
    displayName: String(body.displayName || "").trim(),
    password: String(body.password || ""),
    role: String(body.role || "staff"),
    storeIds: Array.isArray(body.storeIds) ? body.storeIds.map(String) : [],
  }).catch(() => null);

  if (!user) return Response.json({ error: "入力内容を確認してください。" }, { status: 400 });
  return Response.json({ user });
}
