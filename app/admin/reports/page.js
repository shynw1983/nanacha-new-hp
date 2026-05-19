import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin-shell";
import { AdminLogoutButton } from "../../../components/admin-logout-button";
import { AdminReportsBoard } from "../../../components/admin-reports-board";

const { getReportData } = require("../../../server/reports");
const { listActiveStores } = require("../../../server/store-products");
const { getSessionFromCookieStore, filterAccessibleStores, canAccessAllStores } = require("../../../server/admin-auth");

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({ searchParams }) {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) redirect("/admin/login");

  const params = await searchParams;
  const stores = filterAccessibleStores(session, await listActiveStores());
  const report = await getReportData({
    from: params?.from,
    to: params?.to,
    storeId: params?.store,
    status: params?.status,
    storeIds: canAccessAllStores(session) ? undefined : session.storeIds.length ? session.storeIds : ["__none__"],
  });

  return (
    <AdminShell eyebrow="reports" title="レポート" activePath="/admin/reports" actions={<AdminLogoutButton />} currentUser={session}>
      <AdminReportsBoard initialReport={report} stores={stores} canSelectStore={canAccessAllStores(session)} />
    </AdminShell>
  );
}
