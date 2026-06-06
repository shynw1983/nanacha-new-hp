const { listOrders } = require("./orders");

const todayInTokyo = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00+09:00`);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const getDefaultRange = () => {
  const to = todayInTokyo();
  return { from: addDays(to, -6), to };
};

const validStatusFilters = new Set(["all", "sales", "new", "preparing", "ready", "completed", "cancelled", "payment_failed", "pending_payment"]);

const resolveReportFilters = ({ from, to, storeId, status } = {}) => {
  const fallback = getDefaultRange();
  return {
    from: /^\d{4}-\d{2}-\d{2}$/.test(from || "") ? from : fallback.from,
    to: /^\d{4}-\d{2}-\d{2}$/.test(to || "") ? to : fallback.to,
    storeId: storeId && storeId !== "all" ? storeId : "all",
    status: validStatusFilters.has(status) ? status : "all",
  };
};

const inRange = (order, filters) => order.pickupDate >= filters.from && order.pickupDate <= filters.to;
const byStore = (order, filters) => filters.storeId === "all" || order.storeId === filters.storeId;
const isPaid = (order) => order.paymentStatus === "paid";
const isCanceled = (order) => ["cancelled", "payment_failed"].includes(order.status) || ["failed", "canceled"].includes(order.paymentStatus);
const isValidSale = (order) => isPaid(order) && !isCanceled(order);
const byStatus = (order, filters) => {
  if (filters.status === "all") return true;
  if (filters.status === "sales") return isValidSale(order);
  return order.status === filters.status;
};

const summarizeOrders = (orders, filters) => {
  const scopedOrders = orders.filter((order) => inRange(order, filters) && byStore(order, filters) && byStatus(order, filters));
  const paidOrders = scopedOrders.filter(isValidSale);
  const cancelledOrders = scopedOrders.filter(isCanceled);
  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);

  const productMap = new Map();
  paidOrders.forEach((order) => {
    const current = productMap.get(order.drink) || { name: order.drink, quantity: 0, revenue: 0 };
    current.quantity += 1;
    current.revenue += Number(order.amount || 0);
    productMap.set(order.drink, current);
  });

  const storeMap = new Map();
  paidOrders.forEach((order) => {
    const current = storeMap.get(order.storeId) || { storeId: order.storeId, storeName: order.storeName, orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += Number(order.amount || 0);
    storeMap.set(order.storeId, current);
  });

  return {
    filters,
    summary: {
      paidOrders: paidOrders.length,
      revenue,
      averageOrderValue: paidOrders.length ? Math.round(revenue / paidOrders.length) : 0,
      cancelledOrders: cancelledOrders.length,
      totalOrders: scopedOrders.length,
    },
    productRanking: Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue),
    storeSummary: Array.from(storeMap.values()).sort((a, b) => b.revenue - a.revenue),
    orders: scopedOrders,
  };
};

const getReportData = async ({ from, to, storeId, status, storeIds } = {}) => {
  const filters = resolveReportFilters({ from, to, storeId, status });
  const orders = await listOrders({ storeIds });
  return summarizeOrders(orders, filters);
};

const escapeCsv = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const reportToCsv = (report) => {
  const headers = [
    "pickup_date",
    "pickup_time",
    "pickup_code",
    "store_id",
    "store_name",
    "drink",
    "amount",
    "status",
    "payment_status",
    "square_order_id",
    "square_payment_id",
    "paid_at",
    "created_at",
  ];
  const rows = report.orders.map((order) => [
    order.pickupDate,
    order.pickupTime,
    order.pickupCode,
    order.storeId,
    order.storeName,
    order.drink,
    order.amount,
    order.status,
    order.paymentStatus,
    order.squareOrderId,
    order.squarePaymentId,
    order.paidAt,
    order.createdAt,
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
};

module.exports = {
  getDefaultRange,
  resolveReportFilters,
  getReportData,
  reportToCsv,
};
