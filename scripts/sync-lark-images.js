const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
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

const fetchAllRecords = async (token) => {
  const appToken = cleanEnv(process.env.LARK_BASE_APP_TOKEN);
  const tableId = cleanEnv(process.env.LARK_DRINKS_TABLE_ID);

  if (!appToken || !tableId) {
    throw new Error("Missing LARK_BASE_APP_TOKEN or LARK_DRINKS_TABLE_ID.");
  }

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

const getAttachment = (value) => (Array.isArray(value) ? value.find((item) => item?.file_token) : null);

const getAttachmentUrl = (attachment) => {
  if (!attachment?.url) {
    return "";
  }

  return attachment.url;
};

const extensionFor = (attachment, contentType) => {
  const namedExtension = path.extname(attachment.name || "").toLowerCase();

  if (namedExtension) {
    return namedExtension;
  }

  return (
    {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    }[contentType] || ""
  );
};

const safeFileName = (name = "") =>
  cleanEnv(name)
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const outputPathFor = (name, extension) => {
  const fileName = safeFileName(name);

  if (!fileName || !extension) {
    return null;
  }

  return path.join(root, "public", "assets", "menu", `${fileName}${extension}`);
};

const updateImageFile = async (token, recordId, imageFile) => {
  const appToken = cleanEnv(process.env.LARK_BASE_APP_TOKEN);
  const tableId = cleanEnv(process.env.LARK_DRINKS_TABLE_ID);
  const response = await fetch(
    `https://open.larksuite.com/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recordId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          imageFile,
        },
      }),
    },
  );
  const body = await response.json();

  if (!response.ok || body.code !== 0) {
    throw new Error(`Failed to update imageFile for ${recordId}: ${body.msg || response.status}`);
  }
};

const main = async () => {
  loadEnvFile();

  const token = await getTenantAccessToken();
  const records = await fetchAllRecords(token);
  let synced = 0;
  let skipped = 0;

  for (const record of records) {
    const fields = record.fields || {};
    const attachment = getAttachment(fields.image);
    const imageUrl = getAttachmentUrl(attachment);
    if (!attachment || !imageUrl || !fields.name) {
      skipped += 1;
      continue;
    }

    const response = await fetch(imageUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Image download failed for ${fields.name || record.record_id}: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const extension = extensionFor(attachment, contentType);
    const finalOutputPath = outputPathFor(fields.name, extension);

    if (!finalOutputPath) {
      skipped += 1;
      continue;
    }

    const finalImageFile = path.relative(path.join(root, "public"), finalOutputPath);

    mkdirSync(path.dirname(finalOutputPath), { recursive: true });
    writeFileSync(finalOutputPath, Buffer.from(await response.arrayBuffer()));

    if (cleanEnv(fields.imageFile) !== finalImageFile) {
      await updateImageFile(token, record.record_id, finalImageFile);
    }

    synced += 1;
    console.log(`Synced ${fields.name || record.record_id} -> ${finalImageFile}`);
  }

  console.log(`Synced ${synced} image(s); skipped ${skipped} record(s) without both image and name.`);
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
