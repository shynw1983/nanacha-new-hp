import { cookies } from "next/headers";

const { listActiveStores, listStoreProducts } = require("../../../../server/store-products");
const { getSessionFromCookieStore, filterAccessibleStores, hasStoreAccess, canManageProducts } = require("../../../../server/admin-auth");

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

  return Response.json({
    stores,
    selectedStoreId: storeId,
    products: storeId ? await listStoreProducts(storeId) : [],
  });
}
