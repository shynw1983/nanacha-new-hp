import { cookies } from "next/headers";

const { getSessionFromCookieStore, filterAccessibleStores } = require("../../../../server/admin-auth");
const { listActiveStores } = require("../../../../server/store-products");

export async function GET() {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stores = filterAccessibleStores(session, await listActiveStores());

  return Response.json({
    key: process.env.PUSHER_KEY || "",
    cluster: process.env.PUSHER_CLUSTER || "",
    channels: stores.map((store) => `private-admin-orders-${store.id}`),
  });
}
