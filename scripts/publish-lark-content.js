const fs = require("fs");
const path = require("path");
const { getLiveHomepageData } = require("../server/homepage-source");
const { getLiveMenuData } = require("../server/menu-source");

const root = path.resolve(__dirname, "..");
const publishedDir = path.join(root, "published");

const loadLocalEnv = () => {
  const envFile = path.join(root, ".env.local");

  if (!fs.existsSync(envFile)) {
    return;
  }

  fs.readFileSync(envFile, "utf8")
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
      const value = trimmed
        .slice(separator + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");

      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    });
};

const writeJson = (fileName, value) => {
  fs.mkdirSync(publishedDir, { recursive: true });
  fs.writeFileSync(path.join(publishedDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
};

const main = async () => {
  loadLocalEnv();
  const [homepage, baseMenu] = await Promise.all([getLiveHomepageData(), getLiveMenuData()]);
  const stores = baseMenu.stores || [];
  const storeMenus = {};

  for (const store of stores) {
    storeMenus[store.id] = await getLiveMenuData(store.id);
  }

  writeJson("homepage.json", homepage);
  writeJson("menu.json", {
    baseMenu,
    storeMenus,
    publishedAt: new Date().toISOString(),
  });

  console.log(`Published homepage plus ${stores.length} store menu snapshot(s).`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
