const { randomUUID } = require("crypto");
const menu = require("../menu-data.js");

const SQUARE_VERSION = "2026-01-22";

const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");

const cleanAccessToken = (value = "") => cleanEnv(value).replace(/^Bearer\s+/i, "");

const findById = (items, id) => items.find((item) => item.id === id);

const isTapiocaFreeCategory = (category) => menu.tapiocaFreeCategories.includes(category);

const hasWhipByDefault = (category) => menu.whippedCategories.includes(category);

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

const getTokyoMinutes = (date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour").value);
  const minute = Number(parts.find((part) => part.type === "minute").value);

  return hour * 60 + minute;
};

const toMinutes = (time) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
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

  const drink = String(body.drink || "");
  const temperature = String(body.temperature || "");
  const sweetness = String(body.sweetness || "");
  const ice = String(body.ice || "");
  const sizeId = String(body.size || "");
  const optionId = String(body.option || "");
  const toppingIds = Array.isArray(body.toppings) ? body.toppings.map(String) : [];
  const pickup = String(body.pickup || "");
  const menuDrink = menu.drinks.find((item) => item.name === drink);
  const size = findById(menu.sizes, sizeId);
  const option = findById(menu.options, optionId);
  const toppings = toppingIds.map((id) => findById(menu.toppings, id));

  if (!menuDrink) {
    return json(response, 400, { error: "Unknown drink" });
  }

  if (!size || !menu.sweetness.includes(sweetness) || !option) {
    return json(response, 400, { error: "Invalid customization" });
  }

  if (!menuDrink.temperatures.includes(temperature)) {
    return json(response, 400, { error: "Invalid temperature" });
  }

  if (temperature === "HOT" ? ice !== menu.hotIce : !menu.ice.includes(ice)) {
    return json(response, 400, { error: "Invalid ice amount" });
  }

  if (toppings.some((item) => !item)) {
    return json(response, 400, { error: "Invalid topping" });
  }

  if (isTapiocaFreeCategory(menuDrink.category) && toppingIds.includes("no-tapioca")) {
    return json(response, 400, { error: "Invalid topping for tapioca-free category" });
  }

  if (!hasWhipByDefault(menuDrink.category) && toppingIds.includes("no-whip")) {
    return json(response, 400, { error: "Invalid topping for non-whip category" });
  }

  if (!/^\d{2}:\d{2}$/.test(pickup)) {
    return json(response, 400, { error: "Invalid pickup time" });
  }

  const nowMinutes = getTokyoMinutes(new Date());
  const minimumPickupMinutes = getTokyoMinutes(new Date(Date.now() + 5 * 60 * 1000));
  const pickupMinutes = toMinutes(pickup);

  if (minimumPickupMinutes < nowMinutes) {
    return json(response, 400, { error: "Pickup date is required after midnight" });
  }

  if (pickupMinutes < minimumPickupMinutes) {
    return json(response, 400, { error: "Pickup time must be at least 5 minutes from now" });
  }

  const amount =
    menuDrink.price +
    size.price +
    option.price +
    toppings.reduce((sum, item) => sum + item.price, 0);

  if (amount <= 0) {
    return json(response, 400, { error: "Invalid amount" });
  }

  const squareHost =
    environment === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
  const baseUrl = getBaseUrl(request);
  const toppingLabel = toppings.length ? toppings.map((item) => item.label).join(", ") : "トッピングなし";
  const optionLabel = option.id === "none" ? "オプションなし" : option.label;
  const pickupCode = createPickupCode();
  const orderName = `${drink} / ${size.label} / ${temperature} / ${sweetness} / ${ice}`;
  const orderDescription = [
    `pickup number: ${pickupCode}`,
    `nanacha pickup order: ${orderName}`,
    `option: ${optionLabel}`,
    `topping: ${toppingLabel}`,
    `pickup: ${pickup}`,
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
        name: `${drink} (${pickup} pickup)`,
        price_money: {
          amount,
          currency: "JPY",
        },
        location_id: locationId,
      },
      checkout_options: {
        redirect_url: `${baseUrl}/?checkout=complete&pickupCode=${encodeURIComponent(pickupCode)}#reserve`,
        ask_for_shipping_address: false,
      },
    }),
  });

  const squareBody = await squareResponse.json();

  if (!squareResponse.ok) {
    return json(response, squareResponse.status, {
      code: "SQUARE_CHECKOUT_FAILED",
      error: "Square checkout could not be created",
      details: squareBody.errors || squareBody,
    });
  }

  return json(response, 200, {
    checkoutUrl: squareBody.payment_link?.url,
    orderId: squareBody.payment_link?.order_id,
    pickupCode,
  });
};
