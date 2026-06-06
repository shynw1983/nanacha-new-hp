"use client";

import { useEffect, useState } from "react";

const statusSteps = [
  { id: "new", label: "注文受付済み" },
  { id: "preparing", label: "制作中" },
  { id: "ready", label: "受け取りできます" },
  { id: "completed", label: "受け取り完了" },
];

const statusLabels = {
  pending_payment: "決済確認中",
  new: "注文受付済み",
  preparing: "制作中",
  ready: "受け取りできます",
  completed: "受け取り完了",
  cancelled: "キャンセル",
  payment_failed: "決済失敗",
  checkout_failed: "決済作成失敗",
};

const getStepIndex = (status) => statusSteps.findIndex((step) => step.id === status);
const formatLabeledValue = (label, value) => {
  if (!value) return "";
  return String(value).includes(":") ? value : `${label}: ${value}`;
};

export function OrderStatusCard({
  orderId,
  pickupCode,
  pickupDate,
  pickupTime,
  drink,
  size,
  temperature,
  sweetness,
  ice,
  option,
  toppings,
  total,
  initialOrder,
}) {
  const [order, setOrder] = useState(initialOrder || null);
  const [resolvedOrderId, setResolvedOrderId] = useState(orderId || initialOrder?.orderId || "");
  const [connection, setConnection] = useState("loading");
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState("");

  const loadOrder = async () => {
    const params = new URLSearchParams();
    if (resolvedOrderId || orderId) params.set("orderId", resolvedOrderId || orderId);
    if (pickupCode) params.set("pickupCode", pickupCode);
    if (pickupDate) params.set("pickupDate", pickupDate);
    params.set("_", String(Date.now()));
    if (!params.toString()) return;

    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/orders/status?${params.toString()}`, { cache: "no-store" });
      if (response.ok) {
        const body = await response.json();
        setOrder(body.order);
        setResolvedOrderId(body.order?.orderId || resolvedOrderId || orderId || "");
        setError("");
        setLastCheckedAt(
          new Intl.DateTimeFormat("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }).format(new Date()),
        );
      } else {
        setError("注文状況を取得できませんでした。");
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!orderId && !pickupCode) return undefined;
    let active = true;

    loadOrder();
    const interval = window.setInterval(loadOrder, connection === "connected" ? 60000 : 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [orderId, pickupCode, pickupDate, resolvedOrderId, connection]);

  useEffect(() => {
    if (!resolvedOrderId) return undefined;
    let active = true;
    let pusher;
    let channel;

    fetch("/api/orders/realtime-config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then(async (config) => {
        if (!active || !config?.key || !config?.cluster) {
          if (active) setConnection("polling");
          return;
        }
        const { default: Pusher } = await import("pusher-js");
        if (!active) return;
        pusher = new Pusher(config.key, { cluster: config.cluster });
        channel = pusher.subscribe(`order-${resolvedOrderId}`);
        channel.bind("pusher:subscription_succeeded", () => {
          if (active) setConnection("connected");
        });
        channel.bind("order.created", ({ order: nextOrder }) => {
          if (active) setOrder(nextOrder);
        });
        channel.bind("order.updated", ({ order: nextOrder }) => {
          if (active) setOrder(nextOrder);
        });
      })
      .catch(() => {
        if (active) setConnection("polling");
      });

    return () => {
      active = false;
      channel?.unbind_all?.();
      pusher?.unsubscribe(`order-${resolvedOrderId}`);
      pusher?.disconnect();
    };
  }, [resolvedOrderId]);

  if (!orderId && !pickupCode) return null;

  const status = order?.status || "";
  const current = {
    pickupDate: order?.pickupDate || pickupDate,
    pickupTime: order?.pickupTime || pickupTime,
    squareReceiptUrl: order?.squareReceiptUrl || initialOrder?.squareReceiptUrl || "",
    receiptPreviewUrl: order?.receiptPreviewUrl || initialOrder?.receiptPreviewUrl || "",
    drink: order?.drink || drink,
    size: order?.size || size,
    temperature: order?.temperature || temperature,
    sweetness: order?.sweetness || sweetness,
    ice: order?.ice || ice,
    option: order?.option || option,
    toppings: order?.toppings || toppings,
    total: order?.amount || total,
  };
  const activeIndex = getStepIndex(status);
  const isProblem = ["cancelled", "payment_failed", "checkout_failed"].includes(status);
  const effectiveOrderId = resolvedOrderId || orderId || order?.orderId || initialOrder?.orderId || "";
  const effectivePickupCode = order?.pickupCode || initialOrder?.pickupCode || pickupCode || "";
  const localReceiptPreviewUrl = effectiveOrderId && effectivePickupCode
    ? `/api/orders/${effectiveOrderId}/receipt-preview?pickupCode=${encodeURIComponent(effectivePickupCode)}`
    : "";
  const receiptPreviewUrl = current.receiptPreviewUrl || localReceiptPreviewUrl;
  const isPaid = order?.paymentStatus === "paid";

  return (
    <>
      <section className="order-status-card">
        <div className="order-status-heading">
          <div>
            <p className="eyebrow">order status</p>
            <h2>ご注文の状況</h2>
          </div>
          <span className={`order-status-badge ${isProblem ? "is-alert" : ""}`}>
            {order ? statusLabels[status] || status : "確認中"}
          </span>
        </div>

        <ol className="order-status-steps">
          {statusSteps.map((step, index) => (
            <li className={index <= activeIndex ? "is-active" : ""} key={step.id}>{step.label}</li>
          ))}
        </ol>

        {isProblem ? <p className="order-status-note">ご注文状況については、店舗スタッフへお問い合わせください。</p> : null}
        {!order && !error ? <p className="order-status-note">注文状況を確認しています。</p> : null}
        {error ? <p className="order-status-note">{error}</p> : null}
        <div className="order-status-footer">
          <p className="order-status-sync">
            {connection === "connected" ? "状態は自動で更新されます。" : "状態を確認しています。"}
            {lastCheckedAt ? <span>最終確認 {lastCheckedAt}</span> : null}
          </p>
          <div className="order-status-actions">
            {isPaid && receiptPreviewUrl ? (
              <a href={receiptPreviewUrl} target="_blank" rel="noreferrer">
                領収書プレビュー
              </a>
            ) : null}
            {isPaid && current.squareReceiptUrl ? (
              <a href={current.squareReceiptUrl} target="_blank" rel="noreferrer">
                Square レシートを見る
              </a>
            ) : null}
            <button type="button" onClick={loadOrder} disabled={isRefreshing}>
              {isRefreshing ? "更新中..." : "注文状況を更新"}
            </button>
          </div>
        </div>
      </section>

      <section className="order-summary-card">
        <h2>ご注文内容</h2>
        <dl>
          <dt>商品</dt>
          <dd>{current.drink || "—"}</dd>
          <dt>サイズ</dt>
          <dd>{current.size || "—"}</dd>
          <dt>カスタム</dt>
          <dd>
            {[current.temperature, formatLabeledValue("甘さ", current.sweetness), formatLabeledValue("氷", current.ice)]
              .filter(Boolean)
              .join(" / ") || "—"}
          </dd>
          <dt>オプション</dt>
          <dd>{current.option || "—"}</dd>
          <dt>トッピング</dt>
          <dd>{current.toppings || "トッピングなし"}</dd>
          <dt>合計</dt>
          <dd>{current.total ? `¥${Number(current.total).toLocaleString("ja-JP")}` : "—"}</dd>
        </dl>
      </section>
    </>
  );
}
