import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin-shell";
import { AdminLogoutButton } from "../../../components/admin-logout-button";
import { AdminProductsBoard } from "../../../components/admin-products-board";

const { listActiveStores, listStoreProducts } = require("../../../server/store-products");
const { getSessionFromCookieStore, filterAccessibleStores, canManageProducts } = require("../../../server/admin-auth");

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) redirect("/admin/login");
  if (!canManageProducts(session)) redirect("/admin/orders");

  const stores = filterAccessibleStores(session, await listActiveStores());
  const selectedStoreId = stores.find((store) => store.isPrimary)?.id || stores[0]?.id || "";

  return (
    <AdminShell
      eyebrow="catalog"
      title="商品管理"
      activePath="/admin/products"
      actions={<AdminLogoutButton />}
      currentUser={session}
    >
      <AdminProductsBoard
        initialStores={stores}
        initialStoreId={selectedStoreId}
        initialProducts={selectedStoreId ? await listStoreProducts(selectedStoreId) : []}
      />
    </AdminShell>
  );
}
