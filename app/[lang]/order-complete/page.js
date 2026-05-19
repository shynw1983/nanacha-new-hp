export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import { LocalizedShell } from "../../../components/localized-shell";
import { OrderCompleteContent } from "../../../components/order-complete-content";
const { translatedLocales } = require("../../../data/locales");
const { findPublicOrder, getFirstValue, getLocalOrderIds } = require("../../../server/public-orders");

const getOrderIdValue = (value) => getLocalOrderIds(value)[0] || "";

export function generateStaticParams() {
  return translatedLocales.map((lang) => ({ lang }));
}

export default async function LocalizedOrderCompletePage({ params, searchParams }) {
  const { lang } = await params;
  if (!translatedLocales.includes(lang)) notFound();
  const query = await searchParams;
  const orderId = getOrderIdValue(query.orderId);
  const pickupCode = getFirstValue(query.pickupCode);
  const pickupDate = getFirstValue(query.pickupDate);
  const pickupTime = getFirstValue(query.pickupTime);
  const initialOrder = await findPublicOrder({
    orderId,
    pickupCode,
    pickupDate,
  });

  return (
    <LocalizedShell language={lang}>
      <OrderCompleteContent
        orderId={orderId}
        pickupCode={pickupCode}
        pickupDate={pickupDate}
        pickupTime={pickupTime}
        drink={getFirstValue(query.drink)}
        size={getFirstValue(query.size)}
        temperature={getFirstValue(query.temperature)}
        sweetness={getFirstValue(query.sweetness)}
        ice={getFirstValue(query.ice)}
        option={getFirstValue(query.option)}
        toppings={getFirstValue(query.toppings)}
        total={getFirstValue(query.total)}
        initialOrder={initialOrder}
        homeHref={`/${lang}`}
      />
    </LocalizedShell>
  );
}
