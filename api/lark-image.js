const { cleanEnv, getTenantAccessToken } = require("./lark-utils");

const json = (response, statusCode, body) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
};

module.exports = async (request, response) => {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return json(response, 405, { error: "Method not allowed" });
  }

  const fileToken = cleanEnv(request.query.file_token);

  if (!fileToken) {
    return json(response, 400, { error: "Missing image parameters" });
  }

  try {
    const token = await getTenantAccessToken();

    if (!token) {
      return json(response, 500, { error: "Lark is not configured" });
    }

    const imageResponse = await fetch(
      `https://open.larksuite.com/open-apis/drive/v1/medias/${encodeURIComponent(fileToken)}/download`,
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
    response.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
    response.end(imageBuffer);
  } catch (error) {
    console.error(error);
    return json(response, 500, { error: "Failed to load image" });
  }
};
