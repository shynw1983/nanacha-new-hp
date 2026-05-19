import { cookies } from "next/headers";

const { listActiveStores } = require("../../../../server/store-products");
const { getStoreOperation } = require("../../../../server/store-operations");
const { getSessionFromCookieStore, filterAccessibleStores, canManageStores } = require("../../../../server/admin-auth");

export async function GET() {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageStores(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const stores = filterAccessibleStores(session, await listActiveStores());
  return Response.json({
    stores: await Promise.all(
      stores.map(async (store) => ({
        ...store,
        operation: await getStoreOperation(store.id),
      })),
    ),
  });
}
