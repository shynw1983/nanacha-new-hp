const paymentMethods = [
  {
    id: "paypay",
    label: "PayPay",
    src: "/assets/payments/paypay-icon.png",
  },
  {
    id: "alipay-plus",
    label: "Alipay+",
    src: "/assets/payments/alipay-icon.png",
  },
  {
    id: "wechat-pay",
    label: "WeChat Pay",
    src: "/assets/payments/wechat-icon.png",
  },
  {
    id: "visa",
    label: "Visa",
    src: "/assets/payments/visa.png",
    framed: true,
  },
  {
    id: "mastercard",
    label: "Mastercard",
    src: "/assets/payments/mastercard-icon.png",
  },
  {
    id: "jcb",
    label: "JCB",
    src: "/assets/payments/jcb.png",
    framed: true,
  },
];

export function PaymentBadges() {
  return (
    <div
      className="payment-badges"
      aria-label="PayPay, Alipay+, WeChat Pay, Visa, Mastercard, JCB"
    >
      {paymentMethods.map((method) => (
        <span
          className={`payment-badge is-${method.id}${method.framed ? " is-framed" : ""}`}
          title={method.label}
          key={method.id}
        >
          <img src={method.src} alt={method.label} loading="lazy" />
        </span>
      ))}
    </div>
  );
}
