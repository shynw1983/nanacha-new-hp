import { cookies } from "next/headers";

const { updateAdminUser } = require("../../../../../server/admin-users");
const { getSessionFromCookieStore, canManageStaff } = require("../../../../../server/admin-auth");

export async function PATCH(request, { params }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageStaff(session)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  const body = await request.json().catch(() => ({}));
  const user = await updateAdminUser(userId, {
    loginId: typeof body.loginId === "string" ? body.loginId.trim() : undefined,
    displayName: typeof body.displayName === "string" ? body.displayName.trim() : undefined,
    password: typeof body.password === "string" && body.password ? body.password : undefined,
    role: typeof body.role === "string" ? body.role : undefined,
    storeIds: Array.isArray(body.storeIds) ? body.storeIds.map(String) : undefined,
    isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
  });

  if (!user) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ user });
}
