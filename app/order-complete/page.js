export const dynamic = "force-dynamic";
export const revalidate = 0;

import { OrderCompleteContent } from "../../components/order-complete-content";
const { findPublicOrder, getFirstValue, getLocalOrderIds } = require("../../server/public-orders");

const getOrderIdValue = (value) => getLocalOrderIds(value)[0] || "";

export default async function OrderCompletePage({ searchParams }) {
  const params = await searchParams;
  const orderId = getOrderIdValue(params.orderId);
  const pickupCode = getFirstValue(params.pickupCode);
  const pickupDate = getFirstValue(params.pickupDate);
  const pickupTime = getFirstValue(params.pickupTime);
  const initialOrder = await findPublicOrder({
    orderId,
    pickupCode,
    pickupDate,
  });
  return (
    <OrderCompleteContent
      orderId={orderId}
      pickupCode={pickupCode}
      pickupDate={pickupDate}
      pickupTime={pickupTime}
      drink={getFirstValue(params.drink)}
      size={getFirstValue(params.size)}
      temperature={getFirstValue(params.temperature)}
      sweetness={getFirstValue(params.sweetness)}
      ice={getFirstValue(params.ice)}
      option={getFirstValue(params.option)}
      toppings={getFirstValue(params.toppings)}
      total={getFirstValue(params.total)}
      initialOrder={initialOrder}
    />
  );
}
