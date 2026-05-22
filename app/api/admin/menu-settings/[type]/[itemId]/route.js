import { cookies } from "next/headers";

const { deleteMenuSetting, listProductCatalogForAdmin, updateMenuSetting } = require("../../../../../../server/product-catalog");
const { getSessionFromCookieStore, canManageProductCatalog } = require("../../../../../../server/admin-auth");

const authorize = async () => {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!canManageProductCatalog(session)) {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
};

export async function PATCH(request, { params }) {
  const auth = await authorize();
  if (auth.error) return auth.error;

  const { type, itemId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const setting = await updateMenuSetting(type, itemId, body);
    if (!setting) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const catalog = await listProductCatalogForAdmin();
    return Response.json({
      setting,
      menuSettings: catalog.menuSettings,
      settingItems: catalog.settingItems,
    });
  } catch (error) {
    return Response.json({ error: error.message || "設定項目を更新できませんでした。" }, { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  const auth = await authorize();
  if (auth.error) return auth.error;

  const { type, itemId } = await params;
  try {
    await deleteMenuSetting(type, itemId);
    const catalog = await listProductCatalogForAdmin();
    return Response.json({
      ok: true,
      menuSettings: catalog.menuSettings,
      settingItems: catalog.settingItems,
    });
  } catch (error) {
    return Response.json({ error: error.message || "設定項目を削除できませんでした。" }, { status: 400 });
  }
}
