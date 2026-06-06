import { cookies } from "next/headers";

const { createMenuSetting, listProductCatalogForAdmin } = require("../../../../server/product-catalog");
const { getSessionFromCookieStore, canManageProductCatalog } = require("../../../../server/admin-auth");

export async function GET() {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const catalog = await listProductCatalogForAdmin();
  return Response.json({
    menuSettings: catalog.menuSettings,
    settingItems: catalog.settingItems,
    canEditCatalog: catalog.isEditable && canManageProductCatalog(session),
  });
}

export async function POST(request) {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageProductCatalog(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  try {
    const setting = await createMenuSetting(body);
    const catalog = await listProductCatalogForAdmin();
    return Response.json({
      setting,
      menuSettings: catalog.menuSettings,
      settingItems: catalog.settingItems,
    });
  } catch (error) {
    return Response.json({ error: error.message || "設定項目を作成できませんでした。" }, { status: 400 });
  }
}
