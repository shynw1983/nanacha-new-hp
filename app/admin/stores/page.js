import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin-shell";
import { AdminLogoutButton } from "../../../components/admin-logout-button";
import { AdminStoresBoard } from "../../../components/admin-stores-board";

const { listActiveStores } = require("../../../server/store-products");
const { getStoreOperation } = require("../../../server/store-operations");
const { getSessionFromCookieStore, filterAccessibleStores, canManageStores } = require("../../../server/admin-auth");

export const dynamic = "force-dynamic";

export default async function AdminStoresPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) redirect("/admin/login");
  if (!canManageStores(session)) redirect("/admin/orders");

  const stores = filterAccessibleStores(session, await listActiveStores());
  const initialStores = await Promise.all(
    stores.map(async (store) => ({
      ...store,
      operation: await getStoreOperation(store.id),
    })),
  );

  return (
    <AdminShell eyebrow="stores" title="店舗管理" activePath="/admin/stores" actions={<AdminLogoutButton />} currentUser={session}>
      <AdminStoresBoard initialStores={initialStores} />
    </AdminShell>
  );
}
