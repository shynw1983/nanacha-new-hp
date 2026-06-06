const { existsSync, readFileSync } = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const envFile = path.join(root, ".env.local");
const cleanEnv = (value = "") => String(value).trim().replace(/^["']|["']$/g, "");

const loadEnvFile = () => {
  if (!existsSync(envFile)) {
    return;
  }

  readFileSync(envFile, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }

      const separator = trimmed.indexOf("=");

      if (separator === -1) {
        return;
      }

      const key = trimmed.slice(0, separator).trim();
      const value = cleanEnv(trimmed.slice(separator + 1));

      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
};

const getTenantAccessToken = async () => {
  const appId = cleanEnv(process.env.LARK_APP_ID);
  const appSecret = cleanEnv(process.env.LARK_APP_SECRET);

  if (!appId || !appSecret) {
    throw new Error("Missing LARK_APP_ID or LARK_APP_SECRET.");
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

const fetchAllRecords = async (token, appToken, tableId) => {
  const records = [];
  let pageToken = "";

  do {
    const url = new URL(`https://open.larksuite.com/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`);
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

const createRecord = async (token, appToken, tableId, fields) => {
  const response = await fetch(`https://open.larksuite.com/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  const body = await response.json();

  if (!response.ok || body.code !== 0) {
    throw new Error(`Lark record create failed: ${body.msg || response.status}`);
  }
};

const getStores = () => {
  const raw = cleanEnv(process.env.LARK_STORES_JSON);

  if (!raw) {
    throw new Error("Missing LARK_STORES_JSON.");
  }

  return JSON.parse(raw).filter((store) => store?.id && store?.appToken && store?.storeDrinksTableId);
};

const main = async () => {
  loadEnvFile();

  const brandAppToken = cleanEnv(process.env.LARK_BASE_APP_TOKEN);
  const drinksTableId = cleanEnv(process.env.LARK_DRINKS_TABLE_ID);

  if (!brandAppToken || !drinksTableId) {
    throw new Error("Missing LARK_BASE_APP_TOKEN or LARK_DRINKS_TABLE_ID.");
  }

  const token = await getTenantAccessToken();
  const brandDrinks = await fetchAllRecords(token, brandAppToken, drinksTableId);
  const brandById = new Map(
    brandDrinks
      .map((record) => record.fields || {})
      .filter((fields) => fields.drinkId || fields.id)
      .map((fields) => [
        cleanEnv(fields.drinkId || fields.id),
        {
          drinkName: cleanEnv(fields.name),
          category: cleanEnv(fields.category),
        },
      ]),
  );
  const stores = getStores();

  for (const store of stores) {
    const records = await fetchAllRecords(token, store.appToken, store.storeDrinksTableId);
    const storeByDrinkId = new Map(
      records
        .map((record) => ({ recordId: record.record_id, fields: record.fields || {} }))
        .filter((record) => record.fields.drinkId)
        .map((record) => [cleanEnv(record.fields.drinkId), record]),
    );
    let updated = 0;
    let created = 0;

    for (const [drinkId, brandDrink] of brandById) {
      const storeRecord = storeByDrinkId.get(drinkId);

      if (!storeRecord) {
        await createRecord(token, store.appToken, store.storeDrinksTableId, {
          drinkId,
          ...brandDrink,
          isAvailable: true,
          websiteEnabled: true,
          instoreEnabled: true,
          uberEnabled: false,
          snsEnabled: false,
        });
        created += 1;
        continue;
      }

      const fields = storeRecord.fields;

      if (cleanEnv(fields.drinkName) === brandDrink.drinkName && cleanEnv(fields.category) === brandDrink.category) {
        continue;
      }

      await updateRecord(token, store.appToken, store.storeDrinksTableId, storeRecord.recordId, brandDrink);
      updated += 1;
    }

    console.log(`Created ${created} product row(s), updated ${updated} label row(s) for ${store.id}.`);
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
