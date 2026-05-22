import { cookies } from "next/headers";

const { createCategory, listProductCatalogForAdmin } = require("../../../../server/product-catalog");
const { getSessionFromCookieStore, canManageProductCatalog } = require("../../../../server/admin-auth");

export async function GET() {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const catalog = await listProductCatalogForAdmin();
  return Response.json({
    categories: catalog.categories,
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
    const category = await createCategory(body);
    return Response.json({ category });
  } catch (error) {
    return Response.json({ error: error.message || "カテゴリを作成できませんでした。" }, { status: 400 });
  }
}
