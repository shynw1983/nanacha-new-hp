const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");

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

const getOsCheckoutUrl = () => {
  const configured = cleanEnv(process.env.FOUNDR1_OS_CHECKOUT_API_URL);
  if (configured) return configured;
  const baseUrl = cleanEnv(process.env.FOUNDR1_OS_BASE_URL || "https://foundr1.jp");
  return `${baseUrl.replace(/\/$/, "")}/api/public/orders/nanacha/checkout`;
};

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Method not allowed" });
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

  const baseUrl = getBaseUrl(request);
  const completionPath = String(body.completionPath || "/order-complete");
  const completionUrl = new URL(completionPath, baseUrl).toString();

  const osResponse = await fetch(getOsCheckoutUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      completionUrl,
    }),
  });
  const osBody = await osResponse.json().catch(() => ({}));

  return json(response, osResponse.status, osBody);
};
