let pusherPromise;

const getPusher = async () => {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET || !process.env.PUSHER_CLUSTER) {
    return null;
  }

  if (!pusherPromise) {
    pusherPromise = import("pusher").then(({ default: Pusher }) =>
      new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER,
        useTLS: true,
      }),
    );
  }

  return pusherPromise;
};

const publishOrderEvent = async (eventName, order) => {
  const pusher = await getPusher();
  if (!pusher) return;
  if (!order?.storeId) return;
  await Promise.all([
    pusher.trigger(`private-admin-orders-${order.storeId}`, eventName, { order }),
    pusher.trigger(`order-${order.orderId}`, eventName, { order: toPublicOrder(order) }),
  ]);
};

const toPublicOrder = (order) => ({
  orderId: order.orderId,
  pickupCode: order.pickupCode,
  storeId: order.storeId,
  storeName: order.storeName,
  status: order.status,
  paymentStatus: order.paymentStatus,
  squareReceiptUrl: order.squareReceiptUrl,
  drink: order.drink,
  size: order.size,
  temperature: order.temperature,
  sweetness: order.sweetness,
  ice: order.ice,
  option: order.option,
  toppings: order.toppings,
  amount: order.amount,
  pickupDate: order.pickupDate,
  pickupTime: order.pickupTime,
});

module.exports = {
  getPusher,
  publishOrderEvent,
  toPublicOrder,
};
