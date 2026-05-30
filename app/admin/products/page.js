import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin-shell";
import { AdminProductsBoard } from "../../../components/admin-products-board";

const { listActiveStores, listStoreMenuItems, listStoreProducts } = require("../../../server/store-products");
const { listProductCatalogForAdmin } = require("../../../server/product-catalog");
const {
  getSessionFromCookieStore,
  filterAccessibleStores,
  canManageProducts,
  canManageProductCatalog,
} = require("../../../server/admin-auth");

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) redirect("/admin/login");
  if (!canManageProducts(session)) redirect("/admin/orders");

  const stores = filterAccessibleStores(session, await listActiveStores());
  const selectedStoreId = stores.find((store) => store.isPrimary)?.id || stores[0]?.id || "";
  const catalog = await listProductCatalogForAdmin();

  return (
    <AdminShell
      eyebrow="catalog"
      title="商品管理"
      activePath="/admin/products"
      currentUser={session}
    >
      <AdminProductsBoard
        initialStores={stores}
        initialStoreId={selectedStoreId}
        initialProducts={selectedStoreId ? await listStoreProducts(selectedStoreId) : []}
        initialStoreMenuItems={selectedStoreId ? await listStoreMenuItems(selectedStoreId, catalog.menuSettings) : []}
        initialCatalogProducts={catalog.products}
        initialCategories={catalog.categories}
        menuSettings={catalog.menuSettings}
        initialSettingItems={catalog.settingItems}
        canEditCatalog={catalog.isEditable && canManageProductCatalog(session)}
      />
    </AdminShell>
  );
}
