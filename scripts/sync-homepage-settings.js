const { existsSync, readFileSync } = require("fs");
const path = require("path");
const homepage = require("../homepage-data.js");

const root = path.resolve(__dirname, "..");
const envFile = path.join(root, ".env.local");
const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");

const loadEnvFile = () => {
  if (!existsSync(envFile)) return;

  readFileSync(envFile, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const separator = trimmed.indexOf("=");
      if (separator === -1) return;
      const key = trimmed.slice(0, separator).trim();
      const value = cleanEnv(trimmed.slice(separator + 1));
      if (key && !process.env[key]) process.env[key] = value;
    });
};

const getTenantAccessToken = async () => {
  const appId = cleanEnv(process.env.LARK_APP_ID);
  const appSecret = cleanEnv(process.env.LARK_APP_SECRET);
  if (!appId || !appSecret) throw new Error("Missing LARK_APP_ID or LARK_APP_SECRET.");

  const response = await fetch("https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  });
  const body = await response.json();
  if (!response.ok || body.code !== 0 || !body.tenant_access_token) {
    throw new Error(`Lark auth failed: ${body.msg || response.status}`);
  }
  return body.tenant_access_token;
};

const fetchAllRecords = async (token, appToken, tableId) => {
  const records = [];
  let pageToken = "";

  do {
    const url = new URL(`https://open.larksuite.com/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`);
    url.searchParams.set("page_size", "500");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json();
    if (!response.ok || body.code !== 0) {
      throw new Error(`Lark records request failed: ${body.msg || response.status}`);
    }
    records.push(...(body.data?.items || []));
    pageToken = body.data?.page_token || "";
  } while (pageToken);

  return records;
};

const updateRecord = async (token, appToken, tableId, recordId, fields) => {
  const response = await fetch(
    `https://open.larksuite.com/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    },
  );
  const body = await response.json();
  if (!response.ok || body.code !== 0) {
    throw new Error(`Lark record update failed: ${body.msg || response.status}`);
  }
};

const main = async () => {
  loadEnvFile();

  const appToken = cleanEnv(process.env.LARK_HOMEPAGE_BASE_APP_TOKEN);
  const tableId = cleanEnv(process.env.LARK_HOMEPAGE_SETTINGS_TABLE_ID);
  if (!appToken || !tableId) {
    throw new Error("Missing LARK_HOMEPAGE_BASE_APP_TOKEN or LARK_HOMEPAGE_SETTINGS_TABLE_ID.");
  }

  const token = await getTenantAccessToken();
  const records = await fetchAllRecords(token, appToken, tableId);
  const activeRecord = records.find((record) => record.fields?.isActive === true || record.fields?.isActive === "true");
  if (!activeRecord) {
    throw new Error("No active Homepage Settings record found.");
  }

  const fields = {
    heroEyebrow: homepage.settings.heroEyebrow,
    heroTitle: homepage.settings.heroTitle,
    heroDescription: homepage.settings.heroDescription,
    primaryButtonLabel: homepage.settings.primaryButtonLabel,
    primaryButtonUrl: homepage.settings.primaryButtonUrl,
    secondaryButtonLabel: homepage.settings.secondaryButtonLabel,
    secondaryButtonUrl: homepage.settings.secondaryButtonUrl,
    seasonEyebrow: homepage.settings.seasonEyebrow,
    seasonTitle: homepage.settings.seasonTitle,
    seasonIntro: homepage.settings.seasonIntro,
    footerTextLeft: homepage.settings.footerTextLeft,
    footerTextRight: homepage.settings.footerTextRight,
  };

  await updateRecord(token, appToken, tableId, activeRecord.record_id, fields);
  console.log(`Synced active Homepage Settings record ${activeRecord.record_id}.`);
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
