import { cookies } from "next/headers";

const { getSessionFromCookieStore, hasStoreAccess } = require("../../../../server/admin-auth");
const { getPusher } = require("../../../../server/realtime");

export async function POST(request) {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const socketId = String(form.get("socket_id") || "");
  const channelName = String(form.get("channel_name") || "");

  const prefix = "private-admin-orders-";
  const storeId = channelName.startsWith(prefix) ? channelName.slice(prefix.length) : "";
  if (!socketId || !storeId || !hasStoreAccess(session, storeId)) {
    return Response.json({ error: "Invalid realtime request" }, { status: 400 });
  }

  const pusher = await getPusher();
  if (!pusher) {
    return Response.json({ error: "Realtime unavailable" }, { status: 503 });
  }

  return Response.json(pusher.authorizeChannel(socketId, channelName));
}
