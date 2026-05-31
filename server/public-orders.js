const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");

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

const getOsStatusUrl = ({ orderId, pickupCode, pickupDate } = {}) => {
  const configured = cleanEnv(process.env.FOUNDR1_OS_ORDER_STATUS_API_URL);
  const base =
    configured ||
    `${cleanEnv(process.env.FOUNDR1_OS_BASE_URL || "https://foundr1.jp").replace(/\/$/, "")}/api/public/orders/status`;
  const url = new URL(base);
  if (orderId) url.searchParams.set("orderId", orderId);
  if (pickupCode) url.searchParams.set("pickupCode", pickupCode);
  if (pickupDate) url.searchParams.set("pickupDate", pickupDate);
  return url;
};

const findPublicOrder = async ({ orderId, pickupCode, pickupDate } = {}) => {
  const candidateOrderId = getLocalOrderIds(orderId)[0] || "";
  const normalizedPickupCode = normalizePickupCode(pickupCode);

  if (!candidateOrderId && !normalizedPickupCode) {
    return null;
  }

  try {
    const response = await fetch(
      getOsStatusUrl({
        orderId: candidateOrderId,
        pickupCode: normalizedPickupCode,
        pickupDate: getFirstValue(pickupDate),
      }),
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const body = await response.json().catch(() => null);
    return body?.order || body || null;
  } catch (error) {
    console.error(error);
    return null;
  }
};

module.exports = {
  findPublicOrder,
  getFirstValue,
  getLocalOrderIds,
  normalizePickupCode,
};
