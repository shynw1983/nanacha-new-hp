import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminOrdersBoard } from "../../../components/admin-orders-board";
import { AdminShell } from "../../../components/admin-shell";
import { AdminLogoutButton } from "../../../components/admin-logout-button";

const { listOrders } = require("../../../server/orders");
const { getSessionFromCookieStore, canAccessAllStores } = require("../../../server/admin-auth");

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminShell
      eyebrow="orders"
      title="注文管理"
      activePath="/admin/orders"
      actions={<AdminLogoutButton />}
      currentUser={session}
    >
      <AdminOrdersBoard
        initialOrders={await listOrders({
          storeIds: canAccessAllStores(session) ? undefined : session.storeIds.length ? session.storeIds : ["__none__"],
        })}
      />
    </AdminShell>
  );
}
