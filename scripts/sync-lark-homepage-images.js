const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
const path = require("path");
const { cleanEnv, getTenantAccessToken, fetchAllRecords } = require("../server/lark-utils");

const root = path.resolve(__dirname, "..");
const envFile = path.join(root, ".env.local");

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

const getAttachment = (value) => (Array.isArray(value) ? value.find((item) => item?.file_token) : null);

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

const updateImageFile = async (token, recordId, imageFile) => {
  const appToken = cleanEnv(process.env.LARK_HOMEPAGE_BASE_APP_TOKEN);
  const tableId = cleanEnv(process.env.LARK_HOMEPAGE_SLIDES_TABLE_ID);
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
    throw new Error(`Failed to update homepage imageFile for ${recordId}: ${body.msg || response.status}`);
  }
};

const main = async () => {
  loadEnvFile();

  const token = await getTenantAccessToken();
  const records = await fetchAllRecords(
    token,
    cleanEnv(process.env.LARK_HOMEPAGE_SLIDES_TABLE_ID),
    cleanEnv(process.env.LARK_HOMEPAGE_BASE_APP_TOKEN),
  );
  let synced = 0;
  let skipped = 0;

  for (const record of records) {
    const fields = record.fields || {};
    const attachment = getAttachment(fields.image);

    if (!attachment?.url || !fields.slideId) {
      skipped += 1;
      continue;
    }

    const response = await fetch(attachment.url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Homepage image download failed for ${fields.slideId}: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const extension = extensionFor(attachment, contentType);

    if (!extension) {
      skipped += 1;
      continue;
    }

    const finalOutputPath = path.join(root, "public", "assets", "hero", `${cleanEnv(fields.slideId)}${extension}`);
    const finalImageFile = path.relative(path.join(root, "public"), finalOutputPath);

    mkdirSync(path.dirname(finalOutputPath), { recursive: true });
    writeFileSync(finalOutputPath, Buffer.from(await response.arrayBuffer()));

    if (cleanEnv(fields.imageFile) !== finalImageFile) {
      await updateImageFile(token, record.record_id, finalImageFile);
    }

    synced += 1;
    console.log(`Synced ${fields.slideId} -> ${finalImageFile}`);
  }

  console.log(`Synced ${synced} homepage image(s); skipped ${skipped} record(s).`);
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
