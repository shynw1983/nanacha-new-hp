import Link from "next/link";
import { OrderStatusCard } from "./order-status-card";

export function OrderCompleteContent({
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
  homeHref = "/",
}) {
  const displayPickupCode = initialOrder?.pickupCode || pickupCode || "";
  const displayPickupDate = initialOrder?.pickupDate || pickupDate || "";
  const displayPickupTime = initialOrder?.pickupTime || pickupTime || "";
  const receiptUrl = initialOrder?.paymentStatus === "paid" ? initialOrder?.squareReceiptUrl : "";
  const localReceiptPreviewUrl = initialOrder?.orderId && displayPickupCode
    ? `/api/orders/${initialOrder.orderId}/receipt-preview?pickupCode=${encodeURIComponent(displayPickupCode)}`
    : "";
  const receiptPreviewUrl = initialOrder?.paymentStatus === "paid" ? initialOrder?.receiptPreviewUrl || localReceiptPreviewUrl : "";

  return (
    <main className="order-complete-page">
      <section className="order-complete-card">
        <p className="eyebrow">payment complete</p>
        <h1>お支払いが完了しました</h1>
        <p>ご注文ありがとうございます。受け取りの際は、以下の番号と Square の決済画面をご提示ください。</p>
        <p className="order-screenshot-note">この画面をスクリーンショットして保存してください。</p>

        <div className="pickup-code-panel">
          <span>受け取り番号</span>
          <strong>{displayPickupCode || "—"}</strong>
        </div>

        <dl>
          <dt>受け取り日時</dt>
          <dd>{displayPickupDate && displayPickupTime ? `${displayPickupDate} ${displayPickupTime}` : "ご注文内容をご確認ください"}</dd>
          <dt>受け取り場所</dt>
          <dd>店頭 pickup desk</dd>
        </dl>

        <div className="order-complete-actions">
          <Link className="primary-button" href={homeHref}>
            ホームへ戻る
          </Link>
          {receiptPreviewUrl ? (
            <a className="ghost-button" href={receiptPreviewUrl} target="_blank" rel="noreferrer">
              領収書プレビュー
            </a>
          ) : null}
          {receiptUrl ? (
            <a className="ghost-button" href={receiptUrl} target="_blank" rel="noreferrer">
              Square レシートを見る
            </a>
          ) : null}
          <a className="ghost-button" href="#pickup-guide">
            受け取り方法を確認
          </a>
        </div>
      </section>

      <OrderStatusCard
        orderId={orderId}
        pickupCode={displayPickupCode}
        pickupDate={displayPickupDate}
        pickupTime={displayPickupTime}
        drink={drink}
        size={size}
        temperature={temperature}
        sweetness={sweetness}
        ice={ice}
        option={option}
        toppings={toppings}
        total={total}
        initialOrder={initialOrder}
      />

      <section className="order-complete-guide" id="pickup-guide">
        <h2>受け取り時のお願い</h2>
        <ol>
          <li>指定時刻に店舗へお越しください。</li>
          <li>受け取り番号をスタッフへお伝えください。</li>
          <li>Square の決済画面もあわせてご提示ください。</li>
          <li>このURLを開き直すと、注文状況を再確認できます。</li>
        </ol>
      </section>
    </main>
  );
}
