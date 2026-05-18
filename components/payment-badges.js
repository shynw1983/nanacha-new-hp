const paymentMethods = [
  { id: "paypay", label: "PayPay" },
  { id: "alipay", label: "Alipay" },
  { id: "wechat", label: "WeChat Pay" },
  { id: "visa", label: "Visa" },
  { id: "mastercard", label: "Mastercard" },
  { id: "jcb", label: "JCB" },
];

export function PaymentBadges() {
  return (
    <div
      className="payment-badges"
      aria-label="PayPay, Alipay, WeChat Pay, Visa, Mastercard, JCB"
    >
      {paymentMethods.map((method) => (
        <span className={`payment-badge is-${method.id}`} key={method.id}>
          {method.label}
        </span>
      ))}
    </div>
  );
}
