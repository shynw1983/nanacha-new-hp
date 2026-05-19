const { randomUUID } = require("crypto");
const { getMenuData } = require("./menu-source");
const { getHomepageData } = require("./homepage-source");
const {
  compareDateTime,
  getMinimumPickupDateTime,
  getTokyoDateString,
  isWithinOpeningWindow,
} = require("./pickup-time");
const { createOrder, updateOrder } = require("./orders");
const { getStoreOperation } = require("./store-operations");

const SQUARE_VERSION = "2026-01-22";

const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");

const cleanAccessToken = (value = "") => cleanEnv(value).replace(/^Bearer\s+/i, "");

const findById = (items, id) => items.find((item) => item.id === id);

const isTapiocaFreeCategory = (menu, category) => menu.tapiocaFreeCategories.includes(category);

const hasWhipByDefault = (menu, category) => menu.whippedCategories.includes(category);

const json = (response, statusCode, body) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
};

const getBaseUrl = (request) => {
  const protocol = request.headers["x-forwarded-proto"] || "https";
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  return `${protocol}://${host}`;
};

const createPickupCode = () => `N-${String(Math.floor(Math.random() * 9000) + 1000)}`;

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method not allowed" });
  }

  const accessToken = cleanAccessToken(process.env.SQUARE_ACCESS_TOKEN);
  const locationId = cleanEnv(process.env.SQUARE_LOCATION_ID);
  const environment = cleanEnv(process.env.SQUARE_ENVIRONMENT || "production").toLowerCase();

  if (!accessToken || !locationId) {
    return json(response, 500, {
      code: "SQUARE_NOT_CONFIGURED",
      error: "Square is not configured. Set SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID.",
    });
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return json(response, 400, { error: "Invalid request body" });
  }

  const storeId = String(body.store || "");
  const drink = String(body.drink || "");
  const temperature = String(body.temperature || "");
  const sweetness = String(body.sweetness || "");
  const ice = String(body.ice || "");
  const sizeId = String(body.size || "");
  const optionId = String(body.option || "");
  const toppingIds = Array.isArray(body.toppings) ? body.toppings.map(String) : [];
  const requestedItems =
    Array.isArray(body.items) && body.items.length
      ? body.items.map((item) => ({
          drink: String(item.drink || ""),
          temperature: String(item.temperature || ""),
          sweetness: String(item.sweetness || ""),
          ice: String(item.ice || ""),
          size: String(item.size || ""),
          option: String(item.option || ""),
          toppings: Array.isArray(item.toppings) ? item.toppings.map(String) : [],
        }))
      : [
          {
            drink,
            temperature,
            sweetness,
            ice,
            size: sizeId,
            option: optionId,
            toppings: toppingIds,
          },
        ];
  const pickupDate = String(body.pickupDate || "");
  const pickup = String(body.pickup || "");
  const completionPath = String(body.completionPath || "/order-complete");
  const completionSummary = body.completionSummary || {};
  const [menu, homepage, operation] = await Promise.all([
    getMenuData(storeId),
    getHomepageData(),
    getStoreOperation(storeId),
  ]);
  const store = homepage.stores.find((item) => item.id === storeId);

  if (operation && !operation.reservationsEnabled) {
    return json(response, 409, { error: "Reservations are temporarily paused for this store" });
  }

  if (!requestedItems.length || requestedItems.length > 12) {
    return json(response, 400, { error: "Invalid order items" });
  }

  const validatedItems = [];

  for (const item of requestedItems) {
    const menuDrink = menu.drinks.find((drinkItem) => drinkItem.name === item.drink && drinkItem.websiteEnabled !== false);
    const size = findById(menu.sizes, item.size);
    const option = findById(menu.options, item.option);
    const toppings = item.toppings.map((id) => findById(menu.toppings, id));

    if (!menuDrink) {
      return json(response, 400, { error: "Unknown drink" });
    }

    if (!size || !menu.sweetness.includes(item.sweetness) || !option) {
      return json(response, 400, { error: "Invalid customization" });
    }

    if (item.option === "decaf" && !menuDrink.supportsDecaf) {
      return json(response, 400, { error: "Invalid option for drink" });
    }

    if (!menuDrink.temperatures.includes(item.temperature)) {
      return json(response, 400, { error: "Invalid temperature" });
    }

    if (item.temperature === "HOT" ? item.ice !== menu.hotIce : !menu.ice.includes(item.ice)) {
      return json(response, 400, { error: "Invalid ice amount" });
    }

    if (toppings.some((topping) => !topping)) {
      return json(response, 400, { error: "Invalid topping" });
    }

    if (isTapiocaFreeCategory(menu, menuDrink.category) && item.toppings.includes("no-tapioca")) {
      return json(response, 400, { error: "Invalid topping for tapioca-free category" });
    }

    if (!hasWhipByDefault(menu, menuDrink.category) && item.toppings.includes("no-whip")) {
      return json(response, 400, { error: "Invalid topping for non-whip category" });
    }

    const itemAmount =
      menuDrink.price +
      size.price +
      option.price +
      toppings.reduce((sum, topping) => sum + topping.price, 0);

    if (itemAmount <= 0) {
      return json(response, 400, { error: "Invalid amount" });
    }

    validatedItems.push({
      drink: menuDrink,
      size,
      temperature: item.temperature,
      sweetness: item.sweetness,
      ice: item.ice,
      option,
      toppings,
      amount: itemAmount,
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate) || !/^\d{2}:\d{2}$/.test(pickup)) {
    return json(response, 400, { error: "Invalid pickup time" });
  }

  const minimumPickup = getMinimumPickupDateTime();

  if (compareDateTime(pickupDate, pickup, minimumPickup.date, minimumPickup.time) < 0) {
    return json(response, 400, { error: "Pickup time must be at least 5 minutes from now" });
  }

  if (
    store?.hours &&
    !isWithinOpeningWindow({
      pickupDate,
      pickupTime: pickup,
      todayDate: getTokyoDateString(),
      hours: store.hours,
    })
  ) {
    return json(response, 400, { error: "Pickup time is outside store hours" });
  }

  const amount = validatedItems.reduce((sum, item) => sum + item.amount, 0);

  if (amount <= 0) {
    return json(response, 400, { error: "Invalid amount" });
  }

  const squareHost =
    environment === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
  const baseUrl = getBaseUrl(request);
  const itemSummaries = validatedItems.map((item, index) => {
    const toppingLabel = item.toppings.length ? item.toppings.map((topping) => topping.label).join(", ") : "トッピングなし";
    const optionLabel = item.option.id === "none" ? "オプションなし" : item.option.label;
    return {
      name: item.drink.name,
      orderName: `${item.drink.name} / ${item.size.label} / ${item.temperature} / ${item.sweetness} / ${item.ice}`,
      description: `${index + 1}. ${item.drink.name} / ${item.size.label} / ${item.temperature} / ${item.sweetness} / ${item.ice} / ${optionLabel} / ${toppingLabel}`,
      sizeLabel: item.size.label,
      optionLabel,
      toppingLabel,
    };
  });
  const primaryItem = validatedItems[0];
  const primarySummary = itemSummaries[0];
  const drinkLabel =
    itemSummaries.length === 1
      ? primarySummary.name
      : itemSummaries.map((item, index) => `${index + 1}. ${item.name}`).join("\n");
  const itemDetailLabel = itemSummaries.map((item) => item.description).join("\n");
  const sizeLabel = itemSummaries.length === 1 ? primarySummary.sizeLabel : itemDetailLabel;
  const temperatureLabel = itemSummaries.length === 1 ? primaryItem.temperature : "複数商品";
  const sweetnessLabel = itemSummaries.length === 1 ? primaryItem.sweetness : "商品ごと";
  const iceLabel = itemSummaries.length === 1 ? primaryItem.ice : "商品ごと";
  const optionLabel = itemSummaries.length === 1 ? primarySummary.optionLabel : "商品ごと";
  const toppingLabel = itemSummaries.length === 1 ? primarySummary.toppingLabel : "商品ごと";
  const pickupCode = createPickupCode();
  const localOrder = await createOrder({
    pickupCode,
    storeId,
    storeName: store?.name || store?.label || storeId,
    drink: drinkLabel,
    size: sizeLabel,
    temperature: temperatureLabel,
    sweetness: sweetnessLabel,
    ice: iceLabel,
    option: optionLabel,
    toppings: toppingLabel,
    pickupDate,
    pickupTime: pickup,
    amount,
  });
  const orderName = itemSummaries.length === 1 ? primarySummary.orderName : `${itemSummaries.length} items`;
  const orderDescription = [
    `pickup number: ${pickupCode}`,
    `nanacha pickup order: ${orderName}`,
    ...itemSummaries.map((item) => item.description),
    `pickup: ${pickupDate} ${pickup}`,
  ].join(" / ");

  const squareResponse = await fetch(`${squareHost}/v2/online-checkout/payment-links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    },
    body: JSON.stringify({
      idempotency_key: randomUUID(),
      description: orderDescription,
      quick_pay: {
        name: `${itemSummaries.length === 1 ? primarySummary.name : `nanacha pickup ${itemSummaries.length} items`} (${pickupDate} ${pickup} pickup)`,
        price_money: {
          amount,
          currency: "JPY",
        },
        location_id: locationId,
      },
      checkout_options: {
        redirect_url: `${baseUrl}${completionPath}?orderId=${encodeURIComponent(localOrder.orderId)}&pickupCode=${encodeURIComponent(pickupCode)}&pickupDate=${encodeURIComponent(pickupDate)}&pickupTime=${encodeURIComponent(pickup)}&drink=${encodeURIComponent(String(completionSummary.drink || drinkLabel))}&size=${encodeURIComponent(String(completionSummary.size || sizeLabel))}&temperature=${encodeURIComponent(String(completionSummary.temperature || temperatureLabel))}&sweetness=${encodeURIComponent(String(completionSummary.sweetness || sweetnessLabel))}&ice=${encodeURIComponent(String(completionSummary.ice || iceLabel))}&option=${encodeURIComponent(String(completionSummary.option || optionLabel))}&toppings=${encodeURIComponent(Array.isArray(completionSummary.toppings) ? completionSummary.toppings.join(", ") : toppingLabel)}&total=${encodeURIComponent(String(completionSummary.total || amount))}`,
        ask_for_shipping_address: false,
      },
    }),
  });

  const squareBody = await squareResponse.json();

  if (!squareResponse.ok) {
    await updateOrder(localOrder, {
      status: "checkout_failed",
      paymentStatus: "failed",
    });

    return json(response, squareResponse.status, {
      code: "SQUARE_CHECKOUT_FAILED",
      error: "Square checkout could not be created",
      details: squareBody.errors || squareBody,
    });
  }

  await updateOrder(localOrder, {
    squareOrderId: squareBody.payment_link?.order_id || "",
  });

  return json(response, 200, {
    checkoutUrl: squareBody.payment_link?.url,
    orderId: squareBody.payment_link?.order_id,
    localOrderId: localOrder.orderId,
    pickupCode,
  });
};
