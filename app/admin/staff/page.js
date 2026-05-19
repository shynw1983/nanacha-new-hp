import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin-shell";
import { AdminLogoutButton } from "../../../components/admin-logout-button";
import { AdminStaffBoard } from "../../../components/admin-staff-board";

const { listActiveStores } = require("../../../server/store-products");
const { listAdminUsers } = require("../../../server/admin-users");
const { getSessionFromCookieStore, canManageStaff } = require("../../../server/admin-auth");

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) redirect("/admin/login");
  if (!canManageStaff(session)) redirect("/admin/orders");

  return (
    <AdminShell eyebrow="staff" title="スタッフ管理" activePath="/admin/staff" actions={<AdminLogoutButton />} currentUser={session}>
      <AdminStaffBoard initialUsers={await listAdminUsers()} stores={await listActiveStores()} />
    </AdminShell>
  );
}
