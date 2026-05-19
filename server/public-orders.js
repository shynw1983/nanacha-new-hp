const { findOrder } = require("./orders");
const { toPublicOrder } = require("./realtime");

const toValues = (value) => {
  if (Array.isArray(value)) return value.flatMap(toValues);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const getFirstValue = (value) => toValues(value)[0] || "";

const getLocalOrderIds = (value) => {
  const values = toValues(value);
  const localIds = values.filter((item) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item));
  return localIds.length ? localIds : values;
};

const normalizePickupCode = (pickupCode = "") => {
  const value = getFirstValue(pickupCode);
  if (!value) return "";
  return value.startsWith("N-") ? value : `N-${value}`;
};

const findPublicOrder = async ({ orderId, pickupCode, pickupDate } = {}) => {
  const orderIds = getLocalOrderIds(orderId);
  const normalizedPickupCode = normalizePickupCode(pickupCode);
  const rawPickupCode = getFirstValue(pickupCode);
  const rawPickupDate = getFirstValue(pickupDate);

  for (const candidateOrderId of orderIds) {
    const order = await findOrder((item) => item.orderId === candidateOrderId);
    if (order) return toPublicOrder(order);
  }

  const order = normalizedPickupCode && rawPickupDate
    ? await findOrder((item) => [rawPickupCode, normalizedPickupCode].includes(item.pickupCode) && item.pickupDate === rawPickupDate)
    : normalizedPickupCode
      ? await findOrder((item) => [rawPickupCode, normalizedPickupCode].includes(item.pickupCode))
      : null;

  return order ? toPublicOrder(order) : null;
};

module.exports = {
  findPublicOrder,
  getFirstValue,
  getLocalOrderIds,
  normalizePickupCode,
};
