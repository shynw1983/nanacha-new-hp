import { cookies } from "next/headers";

const { updateStoreMenuItem } = require("../../../../../../server/store-products");
const {
  getSessionFromCookieStore,
  hasStoreAccess,
  canManageProducts,
} = require("../../../../../../server/admin-auth");

export async function PATCH(request, { params }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageProducts(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { type, itemId } = await params;
  const body = await request.json().catch(() => ({}));
  const storeId = String(body.storeId || "");
  if (!storeId || !hasStoreAccess(session, storeId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const item = await updateStoreMenuItem(storeId, type, itemId, {
      isAvailable: typeof body.isAvailable === "boolean" ? body.isAvailable : undefined,
    });
    if (!item) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({ item });
  } catch (error) {
    return Response.json({ error: error.message || "設定項目を更新できませんでした。" }, { status: 400 });
  }
}
