import { cookies } from "next/headers";

const { listActiveStores, listStoreProducts } = require("../../../../server/store-products");
const { listProductCatalogForAdmin, createProduct } = require("../../../../server/product-catalog");
const {
  getSessionFromCookieStore,
  filterAccessibleStores,
  hasStoreAccess,
  canManageProducts,
  canManageProductCatalog,
} = require("../../../../server/admin-auth");

export async function GET(request) {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageProducts(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const stores = filterAccessibleStores(session, await listActiveStores());
  const requestedStore = new URL(request.url).searchParams.get("store");
  const storeId = requestedStore || stores.find((store) => store.isPrimary)?.id || stores[0]?.id || "";
  if (storeId && !hasStoreAccess(session, storeId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const catalog = await listProductCatalogForAdmin();

  return Response.json({
    stores,
    selectedStoreId: storeId,
    products: storeId ? await listStoreProducts(storeId) : [],
    catalogProducts: catalog.products,
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
    const product = await createProduct(body);
    return Response.json({ product });
  } catch (error) {
    return Response.json({ error: error.message || "商品を作成できませんでした。" }, { status: 400 });
  }
}
