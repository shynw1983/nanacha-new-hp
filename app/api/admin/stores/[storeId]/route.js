import { cookies } from "next/headers";

const { updateStoreOperation } = require("../../../../../server/store-operations");
const { getSessionFromCookieStore, hasStoreAccess, canManageStores } = require("../../../../../server/admin-auth");

export async function PATCH(request, { params }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageStores(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { storeId } = await params;
  if (!hasStoreAccess(session, storeId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));

  return Response.json({
    operation: await updateStoreOperation(storeId, {
      reservationsEnabled:
        typeof body.reservationsEnabled === "boolean" ? body.reservationsEnabled : undefined,
      statusNote: typeof body.statusNote === "string" ? body.statusNote : undefined,
    }),
  });
}
