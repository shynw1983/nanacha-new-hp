const { randomUUID } = require("crypto");

const SQUARE_VERSION = "2026-01-22";

const drinks = {
  "黒糖タピオカミルク": 590,
  "オレオタピオカフラッペ": 980,
  "黒糖タピオカ八女抹茶ラテ": 640,
  "濃厚マンゴーヨーグルトスムージー": 1500,
};

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

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method not allowed" });
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const environment = process.env.SQUARE_ENVIRONMENT || "production";

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
  const sweetness = String(body.sweetness || "");
  const pickup = String(body.pickup || "");
  const amount = drinks[drink];

  if (!amount) {
    return json(response, 400, { error: "Unknown drink" });
  }

  if (!/^\d{2}:\d{2}$/.test(pickup)) {
    return json(response, 400, { error: "Invalid pickup time" });
  }

  const squareHost =
    environment === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
  const baseUrl = getBaseUrl(request);
  const orderName = `${drink} / ${sweetness} / ${pickup} pickup`;

  const squareResponse = await fetch(`${squareHost}/v2/online-checkout/payment-links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    },
    body: JSON.stringify({
      idempotency_key: randomUUID(),
      description: `nanacha pickup order: ${orderName}`,
      quick_pay: {
        name: orderName,
        price_money: {
          amount,
          currency: "JPY",
        },
        location_id: locationId,
      },
      checkout_options: {
        redirect_url: `${baseUrl}/?checkout=complete#reserve`,
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
  });
};
