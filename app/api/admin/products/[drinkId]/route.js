import { cookies } from "next/headers";

const { updateStoreProduct } = require("../../../../../server/store-products");
const { updateProduct, deleteProduct } = require("../../../../../server/product-catalog");
const {
  getSessionFromCookieStore,
  hasStoreAccess,
  canManageProducts,
  canManageProductCatalog,
} = require("../../../../../server/admin-auth");

export async function PATCH(request, { params }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageProducts(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { drinkId } = await params;
  const body = await request.json().catch(() => ({}));
  const storeId = String(body.storeId || "");

  if (!storeId) {
    if (!canManageProductCatalog(session)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const product = await updateProduct(drinkId, body);
      if (!product) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }
      return Response.json({ product });
    } catch (error) {
      return Response.json({ error: error.message || "商品を更新できませんでした。" }, { status: 400 });
    }
  }

  if (!hasStoreAccess(session, storeId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const product = await updateStoreProduct(storeId, drinkId, {
    isAvailable: typeof body.isAvailable === "boolean" ? body.isAvailable : undefined,
    websiteEnabled: typeof body.websiteEnabled === "boolean" ? body.websiteEnabled : undefined,
    priceOverride: body.priceOverride,
  });

  if (!product) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ product });
}

export async function DELETE(_request, { params }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageProductCatalog(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { drinkId } = await params;
  try {
    await deleteProduct(drinkId);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || "商品を削除できませんでした。" }, { status: 400 });
  }
}
