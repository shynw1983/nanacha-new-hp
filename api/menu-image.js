const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");

const json = (response, statusCode, body) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
};

const getTenantAccessToken = async () => {
  const appId = cleanEnv(process.env.LARK_APP_ID);
  const appSecret = cleanEnv(process.env.LARK_APP_SECRET);

  if (!appId || !appSecret) {
    return null;
  }

  const response = await fetch("https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret,
    }),
  });
  const body = await response.json();

  if (!response.ok || body.code !== 0 || !body.tenant_access_token) {
    throw new Error(`Lark auth failed: ${body.msg || response.status}`);
  }

  return body.tenant_access_token;
};

module.exports = async (request, response) => {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { error: "Method not allowed" });
  }

  const fileToken = String(request.query.file_token || "");
  const tableId = String(request.query.table_id || "");
  const rev = String(request.query.rev || "");

  if (!fileToken || !tableId || !rev) {
    return json(response, 400, { error: "Missing image parameters" });
  }

  try {
    const token = await getTenantAccessToken();

    if (!token) {
      return json(response, 500, { error: "Lark is not configured" });
    }

    const extra = encodeURIComponent(JSON.stringify({ bitablePerm: { tableId, rev: Number(rev) } }));
    const imageResponse = await fetch(
      `https://open.larksuite.com/open-apis/drive/v1/medias/${encodeURIComponent(fileToken)}/download?extra=${extra}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!imageResponse.ok) {
      return json(response, imageResponse.status, { error: "Image not available" });
    }

    const contentType = imageResponse.headers.get("content-type") || "application/octet-stream";
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    response.statusCode = 200;
    response.setHeader("Content-Type", contentType);
    response.setHeader(
      "Cache-Control",
      "public, max-age=31536000, s-maxage=31536000, immutable",
    );
    response.end(imageBuffer);
  } catch (error) {
    console.error(error);
    return json(response, 500, { error: "Failed to load image" });
  }
};
