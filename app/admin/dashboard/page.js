import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "../../../components/admin-shell";
import { AdminLogoutButton } from "../../../components/admin-logout-button";

const { listOrders } = require("../../../server/orders");
const { listActiveStores, listStoreProducts } = require("../../../server/store-products");
const { getStoreOperation } = require("../../../server/store-operations");
const { getSessionFromCookieStore, filterAccessibleStores, canAccessAllStores } = require("../../../server/admin-auth");

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const session = getSessionFromCookieStore(cookieStore);
  if (!session) redirect("/admin/login");

  const stores = filterAccessibleStores(session, await listActiveStores());
  const primaryStore = stores.find((store) => store.isPrimary) || stores[0];
  const [orders, products, operation] = await Promise.all([
    listOrders({
      storeIds: canAccessAllStores(session) ? undefined : session.storeIds.length ? session.storeIds : ["__none__"],
    }),
    primaryStore ? listStoreProducts(primaryStore.id) : [],
    primaryStore ? getStoreOperation(primaryStore.id) : null,
  ]);
  const activeOrders = orders.filter((order) => ["new", "preparing", "ready"].includes(order.status));
  const soldOut = products.filter((product) => !product.isAvailable || !product.websiteEnabled);
  const readyOrders = orders.filter((order) => order.status === "ready");
  const preparingOrders = orders.filter((order) => order.status === "preparing");
  const newOrders = orders.filter((order) => order.status === "new");
  const availableProducts = products.filter((product) => product.isAvailable && product.websiteEnabled);

  return (
    <AdminShell
      eyebrow="overview"
      title="ダッシュボード"
      activePath="/admin/dashboard"
      actions={<AdminLogoutButton />}
      currentUser={session}
    >
      <section className="admin-hero-panel">
        <div>
          <span>{primaryStore?.name || "店舗未設定"}</span>
          <h2>今日の営業状況</h2>
          <p>
            {operation && !operation.reservationsEnabled
              ? "現在、この店舗の予約受付は停止中です。"
              : activeOrders.length
              ? `${activeOrders.length}件の注文に対応中です。`
              : "現在、対応中の注文はありません。"}
          </p>
        </div>
        <div className="admin-hero-pills">
          <span>{operation?.reservationsEnabled === false ? "予約停止中" : "予約受付中"}</span>
          <span>{availableProducts.length} 商品販売中</span>
          <span>{soldOut.length} 商品停止中</span>
        </div>
      </section>

      <section className="admin-metric-grid">
        <article>
          <span>対応中の注文</span>
          <strong>{activeOrders.length}</strong>
        </article>
        <article>
          <span>新規注文</span>
          <strong>{newOrders.length}</strong>
        </article>
        <article>
          <span>制作中</span>
          <strong>{preparingOrders.length}</strong>
        </article>
        <article>
          <span>受け取り待ち</span>
          <strong>{readyOrders.length}</strong>
        </article>
      </section>

      <section className="admin-two-column">
        <article className="admin-panel">
          <div className="admin-panel-heading">
            <h2>直近の注文</h2>
          </div>
          <div className="admin-mini-list">
            {activeOrders.slice(0, 5).map((order) => (
              <div key={order.orderId}>
                <strong>{order.pickupCode}</strong>
                <span>{order.drink}</span>
                <em>{order.pickupTime}</em>
              </div>
            ))}
            {!activeOrders.length ? <p>現在、対応中の注文はありません。</p> : null}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-heading">
            <h2>停止中の商品</h2>
          </div>
          <div className="admin-mini-list">
            {soldOut.slice(0, 5).map((product) => (
              <div key={product.drinkId}>
                <strong>{product.name}</strong>
                <span>{product.categoryLabel}</span>
                <em>{product.isAvailable ? "予約停止" : "売り切れ"}</em>
              </div>
            ))}
            {!soldOut.length ? <p>停止中の商品はありません。</p> : null}
          </div>
        </article>
      </section>
    </AdminShell>
  );
}
