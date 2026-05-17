const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");
const textValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(textValue).filter(Boolean).join(", ");
  }

  if (value && typeof value === "object") {
    return value.text || value.name || value.link || value.url || "";
  }

  return value == null ? "" : String(value);
};
const booleanValue = (value) => value === true || value === "true" || value === "TRUE" || value === 1;
const imageValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(imageValue).find(Boolean) || "";
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  if (value.file_token && value.url) {
    try {
      const sourceUrl = new URL(value.url);
      const extra = JSON.parse(sourceUrl.searchParams.get("extra") || "{}");
      const tableId = extra.bitablePerm?.tableId;
      const rev = extra.bitablePerm?.rev;

      if (tableId && rev != null) {
        const proxyUrl = new URL("/api/menu-image", "https://example.com");
        proxyUrl.searchParams.set("file_token", value.file_token);
        proxyUrl.searchParams.set("table_id", tableId);
        proxyUrl.searchParams.set("rev", String(rev));
        return `${proxyUrl.pathname}${proxyUrl.search}`;
      }
    } catch {
      // Fall through to other supported image sources.
    }
  }

  return value.url || value.tmp_url || value.link || "";
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

const fetchAllRecords = async (token, tableId, appToken = cleanEnv(process.env.LARK_BASE_APP_TOKEN)) => {
  if (!appToken || !tableId) {
    return [];
  }

  const records = [];
  let pageToken = "";

  do {
    const url = new URL(
      `https://open.larksuite.com/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
    );
    url.searchParams.set("page_size", "500");

    if (pageToken) {
      url.searchParams.set("page_token", pageToken);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const body = await response.json();

    if (!response.ok || body.code !== 0) {
      throw new Error(`Lark records request failed: ${body.msg || response.status}`);
    }

    records.push(...(body.data?.items || []));
    pageToken = body.data?.page_token || "";
  } while (pageToken);

  return records;
};

module.exports = {
  cleanEnv,
  textValue,
  booleanValue,
  imageValue,
  getTenantAccessToken,
  fetchAllRecords,
};
