"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

const nextActions = {
  new: [{ status: "preparing", label: "制作開始" }],
  preparing: [{ status: "ready", label: "受け取り可" }],
  ready: [{ status: "completed", label: "受け渡し完了" }],
};
const paymentStatusLabels = {
  pending: "未決済",
  paid: "支払済み",
  failed: "失敗",
  canceled: "キャンセル",
};
const splitOrderLines = (value = "") =>
  String(value)
    .split(/\n+|\s\/\s(?=\d+\.\s)/)
    .map((item) => item.trim())
    .filter(Boolean);
const formatLabeledValue = (label, value) => {
  if (!value) return "";
  return String(value).includes(":") ? value : `${label}: ${value}`;
};
const getOrderItemLines = (order) => {
  if (!order) return [];
  const sizeLines = splitOrderLines(order.size);
  if (sizeLines.length > 1) return sizeLines;

  const toppingLines = splitOrderLines(order.toppings);
  if (toppingLines.length > 1 && /^\d+\.\s/.test(toppingLines[0])) return toppingLines;

  return [];
};

const shouldNotifyNewOrder = (previousOrder, nextOrder) =>
  nextOrder?.paymentStatus === "paid" &&
  nextOrder?.status === "new" &&
  (!previousOrder || previousOrder.paymentStatus !== "paid" || previousOrder.status !== "new");

export function AdminOrdersBoard({ initialOrders }) {
  const [orders, setOrders] = useState(initialOrders);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrders[0]?.orderId || "");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");
  const [statusError, setStatusError] = useState("");
  const audioContextRef = useRef(null);

  const ensureAudioReady = async () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    setSoundReady(true);
  };

  const playNewOrderSound = () => {
    if (!soundEnabled || !audioContextRef.current || audioContextRef.current.state !== "running") return;
    const context = audioContextRef.current;
    const playTone = (frequency, startAt, duration, volume = 0.42) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.02);
    };

    const now = context.currentTime;
    playTone(1046.5, now, 0.16, 0.38);
    playTone(1568, now + 0.18, 0.18, 0.46);
    playTone(1046.5, now + 0.48, 0.16, 0.38);
    playTone(1568, now + 0.66, 0.22, 0.48);
  };

  const refresh = async () => {
    setIsRefreshing(true);
    const response = await fetch("/api/admin/orders", { cache: "no-store" });
    if (response.ok) {
      const body = await response.json();
      const nextOrders = body.orders || [];
      setOrders((current) => {
        const currentById = new Map(current.map((order) => [order.orderId, order]));
        const incomingIds = nextOrders
          .filter((order) => shouldNotifyNewOrder(currentById.get(order.orderId), order))
          .map((order) => order.orderId);

        if (incomingIds.length) {
          setNewOrderIds(incomingIds);
          setSelectedOrderId((currentSelected) => currentSelected || incomingIds[0]);
          playNewOrderSound();
          window.setTimeout(() => setNewOrderIds([]), 10000);
        }

        return nextOrders;
      });
      setLastUpdatedAt(
        new Intl.DateTimeFormat("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date()),
      );
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    refresh();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    if (realtimeStatus === "connected") return undefined;
    const interval = window.setInterval(refresh, 5000);
    return () => window.clearInterval(interval);
  }, [realtimeStatus]);

  useEffect(() => {
    let pusher;
    let channels = [];
    let active = true;
    const upsertOrder = ({ order }) => {
      setOrders((current) => {
        const previousOrder = current.find((item) => item.orderId === order.orderId);
        const exists = Boolean(previousOrder);
        const next = exists
          ? current.map((item) => (item.orderId === order.orderId ? order : item))
          : [order, ...current];

        if (shouldNotifyNewOrder(previousOrder, order)) {
          setNewOrderIds([order.orderId]);
          setSelectedOrderId(order.orderId);
          playNewOrderSound();
          window.setTimeout(() => setNewOrderIds([]), 10000);
        }

        return next;
      });
    };
    setRealtimeStatus("connecting");
    fetch("/api/admin/realtime-config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then(async (config) => {
        if (!active) return;
        if (!config?.key || !config?.cluster || !config?.channels?.length) {
          setRealtimeStatus("unavailable");
          return;
        }
        const { default: Pusher } = await import("pusher-js");
        if (!active) return;
        pusher = new Pusher(config.key, {
          cluster: config.cluster,
          channelAuthorization: {
            endpoint: "/api/admin/realtime-auth",
            transport: "ajax",
          },
        });
        pusher.connection.bind("unavailable", () => {
          if (active) setRealtimeStatus("unavailable");
        });
        pusher.connection.bind("failed", () => {
          if (active) setRealtimeStatus("failed");
        });
        pusher.connection.bind("disconnected", () => {
          if (active) setRealtimeStatus("disconnected");
        });
        channels = config.channels.map((channelName) => {
          const channel = pusher.subscribe(channelName);
          channel.bind("pusher:subscription_succeeded", () => {
            if (active) setRealtimeStatus("connected");
          });
          channel.bind("pusher:subscription_error", () => {
            if (active) setRealtimeStatus("failed");
          });
          channel.bind("order.created", upsertOrder);
          channel.bind("order.updated", upsertOrder);
          return channel;
        });
      })
      .catch(() => {
        if (active) setRealtimeStatus("failed");
      });

    return () => {
      active = false;
      channels.forEach((channel) => {
        channel.unbind("order.created", upsertOrder);
        channel.unbind("order.updated", upsertOrder);
        pusher?.unsubscribe(channel.name);
      });
      pusher?.disconnect();
    };
  }, [soundEnabled]);

  const visibleOrders = useMemo(
    () =>
      orders.filter((order) => {
        const matchesQuery = `${order.pickupCode} ${order.drink}`.toLowerCase().includes(query.toLowerCase());
        const matchesStatus =
          status === "all"
            ? true
            : status === "active"
              ? ["new", "preparing", "ready"].includes(order.status)
              : order.status === status;
        return matchesQuery && matchesStatus;
      }),
    [orders, query, status],
  );

  const selectedOrder = visibleOrders.find((order) => order.orderId === selectedOrderId) || visibleOrders[0];
  const selectedOrderItemLines = getOrderItemLines(selectedOrder);
  const counters = {
    new: orders.filter((order) => order.status === "new").length,
    preparing: orders.filter((order) => order.status === "preparing").length,
    ready: orders.filter((order) => order.status === "ready").length,
  };

  const updateStatus = async (orderId, nextStatus) => {
    setStatusError("");
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (response.ok) {
      const body = await response.json();
      setOrders((current) => current.map((order) => (order.orderId === orderId ? body.order : order)));
    } else {
      setStatusError("注文状態を更新できませんでした。ページを再読み込みしてもう一度お試しください。");
    }
  };

  return (
    <>
      <section className="admin-inline-stats">
        <article>
          <span>新規</span>
          <strong>{counters.new}</strong>
        </article>
        <article>
          <span>制作中</span>
          <strong>{counters.preparing}</strong>
        </article>
        <article>
          <span>受け取り可</span>
          <strong>{counters.ready}</strong>
        </article>
      </section>

      <section className="admin-toolbar">
        <input
          aria-label="注文を検索"
          placeholder="受取番号または商品名で検索"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="active">対応中</option>
          <option value="new">新規</option>
          <option value="preparing">制作中</option>
          <option value="ready">受け取り可</option>
          <option value="completed">完了</option>
          <option value="all">すべて</option>
        </select>
        <button type="button" onClick={refresh}>
          {isRefreshing ? "更新中..." : "更新"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={async () => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            if (next) await ensureAudioReady();
          }}
        >
          {soundEnabled ? "通知音 ON" : "通知音 OFF"}
        </button>
        {!soundEnabled ? <span className="admin-sound-hint">新規注文の通知音を有効にできます</span> : null}
        {statusError ? <span className="admin-error">{statusError}</span> : null}
        {realtimeStatus !== "connected" ? (
          <span className="admin-live-status">
            <i />
            補助更新中{lastUpdatedAt ? ` · ${lastUpdatedAt}` : ""}
          </span>
        ) : null}
        <span className={`admin-realtime-status is-${realtimeStatus}`}>
          リアルタイム接続：
          {realtimeStatus === "connected"
            ? "接続済み"
            : realtimeStatus === "connecting"
              ? "接続中"
              : realtimeStatus === "disconnected"
                ? "切断済み"
                : "異常"}
        </span>
      </section>

      <section className="admin-orders-layout">
        <div className="admin-table-panel">
          <table>
            <thead>
              <tr>
                <th>受取</th>
                <th>番号</th>
                <th>商品</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => (
                <tr
                  className={[
                    selectedOrder?.orderId === order.orderId ? "is-selected" : "",
                    newOrderIds.includes(order.orderId) ? "is-new" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={order.orderId}
                  onClick={() => setSelectedOrderId(order.orderId)}
                >
                  <td>{order.pickupDate}<br />{order.pickupTime}</td>
                  <td>{order.pickupCode}</td>
                  <td className="admin-order-product-cell">
                    {splitOrderLines(order.drink).map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </td>
                  <td><span className={`status-${order.status}`}>{statusLabels[order.status] || order.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleOrders.length ? <p className="admin-empty-copy">該当する注文はありません。</p> : null}
        </div>

        <aside className="admin-detail-panel">
          {selectedOrder ? (
            <>
              <div>
                <span className={`status-${selectedOrder.status}`}>{statusLabels[selectedOrder.status] || selectedOrder.status}</span>
                <h2>{selectedOrder.pickupCode}</h2>
                <p className="admin-order-product-lines">
                  {splitOrderLines(selectedOrder.drink).map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </p>
              </div>
              <dl>
                <dt>受取時間</dt>
                <dd>{selectedOrder.pickupDate} {selectedOrder.pickupTime}</dd>
                {selectedOrderItemLines.length ? (
                  <>
                    <dt>商品明細</dt>
                    <dd>
                      <ol className="admin-order-item-lines">
                        {selectedOrderItemLines.map((line) => (
                          <li key={line}>{line.replace(/^\d+\.\s*/, "")}</li>
                        ))}
                      </ol>
                    </dd>
                  </>
                ) : (
                  <>
                    <dt>内容</dt>
                    <dd>
                      {[
                        selectedOrder.size,
                        selectedOrder.temperature,
                        formatLabeledValue("甘さ", selectedOrder.sweetness),
                        formatLabeledValue("氷", selectedOrder.ice),
                      ]
                        .filter(Boolean)
                        .join(" / ")}
                    </dd>
                    <dt>オプション</dt>
                    <dd>{selectedOrder.option}</dd>
                    <dt>トッピング</dt>
                    <dd>{selectedOrder.toppings}</dd>
                  </>
                )}
                <dt>合計</dt>
                <dd>¥{selectedOrder.amount}</dd>
                <dt>支払い</dt>
                <dd>{paymentStatusLabels[selectedOrder.paymentStatus] || selectedOrder.paymentStatus}</dd>
                <dt>Square 注文ID</dt>
                <dd>{selectedOrder.squareOrderId || "—"}</dd>
                <dt>Square 支払ID</dt>
                <dd>{selectedOrder.squarePaymentId || "—"}</dd>
                <dt>支払時刻</dt>
                <dd>{selectedOrder.paidAt || "—"}</dd>
                <dt>作成時刻</dt>
                <dd>{selectedOrder.createdAt || "—"}</dd>
              </dl>
              {selectedOrder.squareReceiptUrl ? (
                <a className="admin-inline-link" href={selectedOrder.squareReceiptUrl} target="_blank" rel="noreferrer">
                  Square レシートを開く
                </a>
              ) : null}
              <div className="admin-order-actions">
                {(nextActions[selectedOrder.status] || []).map((action) => (
                  <button key={action.status} type="button" onClick={() => updateStatus(selectedOrder.orderId, action.status)}>
                    {action.label}
                  </button>
                ))}
                {!["completed", "cancelled"].includes(selectedOrder.status) ? (
                  <button type="button" className="secondary" onClick={() => updateStatus(selectedOrder.orderId, "cancelled")}>
                    キャンセル
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <p>注文を選択してください。</p>
          )}
        </aside>
      </section>
    </>
  );
}
