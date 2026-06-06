import { cookies } from "next/headers";

const { deleteCategory, updateCategory } = require("../../../../../server/product-catalog");
const { getSessionFromCookieStore, canManageProductCatalog } = require("../../../../../server/admin-auth");

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

  const { categoryId } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const category = await updateCategory(categoryId, body);
    if (!category) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    return Response.json({ category });
  } catch (error) {
    return Response.json({ error: error.message || "カテゴリを更新できませんでした。" }, { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  const auth = await authorize();
  if (auth.error) return auth.error;

  const { categoryId } = await params;
  try {
    await deleteCategory(categoryId);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || "カテゴリを削除できませんでした。" }, { status: 400 });
  }
}
