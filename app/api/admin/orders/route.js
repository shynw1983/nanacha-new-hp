import { cookies } from "next/headers";

const { listOrders } = require("../../../../server/orders");
const { getSessionFromCookieStore, canAccessAllStores } = require("../../../../server/admin-auth");

export async function GET() {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({
    orders: await listOrders({
      storeIds: canAccessAllStores(session) ? undefined : session.storeIds.length ? session.storeIds : ["__none__"],
    }),
  });
}
