"use client";

import { useMemo, useState } from "react";

const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });

const statusLabels = {
  new: "新規",
  preparing: "制作中",
  ready: "受け取り可",
  completed: "完了",
  cancelled: "キャンセル",
  pending_payment: "未決済",
  checkout_failed: "決済作成失敗",
  payment_failed: "決済失敗",
};

const paymentStatusLabels = {
  pending: "未決済",
  paid: "支払済み",
  failed: "失敗",
  canceled: "キャンセル",
};

const getReportOrderState = (order) => {
  if (order.status === "cancelled" || order.paymentStatus === "canceled") return { label: "キャンセル", tone: "cancelled" };
  if (order.status === "payment_failed" || order.paymentStatus === "failed") return { label: "失敗", tone: "failed" };
  if (order.paymentStatus !== "paid") return { label: "未決済", tone: "pending" };
  if (order.status === "completed") return { label: "完了", tone: "sale" };
  if (order.status === "ready") return { label: "受け取り可", tone: "sale" };
  if (order.status === "preparing") return { label: "制作中", tone: "sale" };
  return { label: "売上対象", tone: "sale" };
};

export function AdminReportsBoard({ initialReport, stores, canSelectStore }) {
  const [report, setReport] = useState(initialReport);
  const [filters, setFilters] = useState(initialReport.filters);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [statusError, setStatusError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      from: filters.from,
      to: filters.to,
      store: filters.storeId || "all",
      status: filters.status || "all",
    });
    return params.toString();
  }, [filters]);

  const fetchReport = async () => {
    setIsLoading(true);
    const response = await fetch(`/api/admin/reports?${queryString}`, { cache: "no-store" });
    if (response.ok) setReport(await response.json());
    setIsLoading(false);
  };

  const loadReport = async (event) => {
    event.preventDefault();
    await fetchReport();
  };

  const updateOrderStatus = async (orderId, status) => {
    setUpdatingOrderId(orderId);
    setStatusError("");
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (response.ok) await fetchReport();
    else setStatusError("注文状態を更新できませんでした。権限または注文状態を確認してください。");
    setUpdatingOrderId("");
  };

  return (
    <>
      <form className="admin-toolbar admin-report-toolbar" onSubmit={loadReport}>
        <label>
          開始日
          <input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
        </label>
        <label>
          終了日
          <input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
        </label>
        {canSelectStore ? (
          <label>
            店舗
            <select value={filters.storeId} onChange={(event) => setFilters({ ...filters, storeId: event.target.value })}>
              <option value="all">すべて</option>
              {stores.map((store) => (
                <option value={store.id} key={store.id}>{store.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          注文状態
          <select value={filters.status || "all"} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="all">すべて</option>
            <option value="sales">売上対象</option>
            <option value="new">新規</option>
            <option value="preparing">制作中</option>
            <option value="ready">受け取り可</option>
            <option value="completed">完了</option>
            <option value="cancelled">キャンセル</option>
            <option value="payment_failed">失敗</option>
            <option value="pending_payment">未決済</option>
          </select>
        </label>
        <button type="submit">{isLoading ? "集計中..." : "集計"}</button>
        <a className="admin-secondary-button" href={`/api/admin/reports/export?${queryString}`}>
          CSV Export
        </a>
        {statusError ? <span className="admin-error">{statusError}</span> : null}
      </form>

      <section className="admin-metric-grid">
        <article>
          <span>売上</span>
          <strong>{yen.format(report.summary.revenue)}</strong>
        </article>
        <article>
          <span>支払済み注文</span>
          <strong>{report.summary.paidOrders}</strong>
        </article>
        <article>
          <span>平均客単価</span>
          <strong>{yen.format(report.summary.averageOrderValue)}</strong>
        </article>
        <article>
          <span>キャンセル / 失敗</span>
          <strong>{report.summary.cancelledOrders}</strong>
        </article>
      </section>

      <section className="admin-two-column">
        <article className="admin-panel">
          <div className="admin-panel-heading">
            <h2>商品ランキング</h2>
          </div>
          <div className="admin-mini-list">
            {report.productRanking.slice(0, 10).map((product) => (
              <div key={product.name}>
                <strong>{product.name}</strong>
                <span>{product.quantity} 件</span>
                <em>{yen.format(product.revenue)}</em>
              </div>
            ))}
            {!report.productRanking.length ? <p>該当する販売データはありません。</p> : null}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-heading">
            <h2>店舗別売上</h2>
          </div>
          <div className="admin-mini-list">
            {report.storeSummary.map((store) => (
              <div key={store.storeId}>
                <strong>{store.storeName}</strong>
                <span>{store.orders} 件</span>
                <em>{yen.format(store.revenue)}</em>
              </div>
            ))}
            {!report.storeSummary.length ? <p>該当する店舗データはありません。</p> : null}
          </div>
        </article>
      </section>

      <section className="admin-table-panel admin-report-orders">
        <table>
          <thead>
            <tr>
              <th>日付</th>
              <th>番号</th>
              <th>店舗</th>
              <th>商品</th>
              <th>金額</th>
              <th>状態</th>
              <th>支払い</th>
              <th>修正</th>
            </tr>
          </thead>
          <tbody>
            {report.orders.slice(0, 50).map((order) => (
              (() => {
                const state = getReportOrderState(order);
                return (
                  <tr key={order.orderId}>
                    <td>{order.pickupDate}<br />{order.pickupTime}</td>
                    <td>{order.pickupCode}</td>
                    <td>{order.storeName}</td>
                    <td className="admin-report-product-cell">{order.drink}</td>
                    <td>{yen.format(order.amount)}</td>
                    <td>
                      <span className={`admin-report-state is-${state.tone}`}>{state.label}</span>
                      <small>{statusLabels[order.status] || order.status}</small>
                    </td>
                    <td>{paymentStatusLabels[order.paymentStatus] || order.paymentStatus}</td>
                    <td>
                      <select
                        className="admin-report-status-select"
                        value={order.status}
                        disabled={updatingOrderId === order.orderId}
                        onChange={(event) => updateOrderStatus(order.orderId, event.target.value)}
                      >
                        <option value="new">新規</option>
                        <option value="preparing">制作中</option>
                        <option value="ready">受け取り可</option>
                        <option value="completed">完了</option>
                        <option value="cancelled">キャンセル</option>
                        <option value="payment_failed">失敗</option>
                      </select>
                    </td>
                  </tr>
                );
              })()
            ))}
          </tbody>
        </table>
        {!report.orders.length ? <p className="admin-empty-copy">該当する注文はありません。</p> : null}
      </section>
    </>
  );
}
