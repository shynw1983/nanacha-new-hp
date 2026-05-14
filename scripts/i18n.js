const fs = require("fs");
const path = require("path");
const { NANACHA_MENU } = { NANACHA_MENU: require("../menu-data.js") };

const root = path.resolve(__dirname, "..");
const localeDir = path.join(root, "locales");
const sourceFiles = ["index.html", "menu.html"];

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

loadLocalEnv();

const languages = {
  en: "en",
  zh: "zh",
  ko: "ko",
};
const openAiLanguages = {
  en: "English",
  zh: "Simplified Chinese",
  ko: "Korean",
};
const openAiEndpoint = "https://api.openai.com/v1/responses";
const openAiModel = process.env.OPENAI_TRANSLATION_MODEL || "gpt-4.1-mini";
const openAiBatchSize = Math.max(1, Number(process.env.OPENAI_TRANSLATION_BATCH_SIZE || 50) || 50);
const openAiTargetLanguages = (process.env.OPENAI_TRANSLATION_LANGUAGES || "")
  .split(",")
  .map((language) => language.trim())
  .filter(Boolean);

const extraTexts = [
  "合計",
  "決済画面を作成中...",
  "Square設定が未完了です。店舗側でVercelの環境変数を設定してください。",
  "決済画面を作成できませんでした。時間をおいて再度お試しください。",
  "お支払いありがとうございます。店頭でお名前とSquareの決済画面をご提示ください。",
];

const normalize = (text) => text.replace(/\s+/g, " ").trim();

const shouldTranslate = (text) => {
  const value = normalize(text);

  if (!value || value.length < 2) {
    return false;
  }

  if (/^[\d\s:.,+¥%()/-]+$/.test(value)) {
    return false;
  }

  return /[A-Za-z\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(value);
};

const stripNoTranslate = (html) =>
  html.replace(/<([a-z0-9-]+)(?=[^>]*\bdata-no-translate\b)[^>]*>[\s\S]*?<\/\1>/gi, " ");

const stripIgnoredTags = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ");

const decodeEntities = (text) =>
  text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const collectHtmlTexts = () => {
  const texts = [];

  sourceFiles.forEach((file) => {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    const stripped = stripIgnoredTags(stripNoTranslate(html));
    const withoutTags = stripped.replace(/<[^>]+>/g, "\n");

    withoutTags.split("\n").forEach((line) => {
      const text = normalize(decodeEntities(line));

      if (shouldTranslate(text)) {
        texts.push(text);
      }
    });
  });

  return texts;
};

const collectMenuTexts = () => {
  const texts = [];
  const push = (text) => {
    if (shouldTranslate(text)) {
      texts.push(normalize(text));
    }
  };

  NANACHA_MENU.categories.forEach((category) => push(category.label));
  NANACHA_MENU.drinks.forEach((drink) => push(drink.name));
  NANACHA_MENU.sizes.forEach((size) => push(size.label));
  NANACHA_MENU.sweetness.forEach(push);
  NANACHA_MENU.ice.forEach(push);
  push(NANACHA_MENU.hotIce);
  NANACHA_MENU.options.forEach((option) => push(option.label));
  NANACHA_MENU.toppings.forEach((topping) => push(topping.label));
  extraTexts.forEach(push);

  return texts;
};

const getSourceTexts = () => Array.from(new Set([...collectHtmlTexts(), ...collectMenuTexts()])).sort();

const readJson = (file, fallback = {}) => {
  if (!fs.existsSync(file)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(file, "utf8"));
};

const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
};

const extract = () => {
  const texts = getSourceTexts();
  const ja = Object.fromEntries(texts.map((text) => [text, text]));

  writeJson(path.join(localeDir, "ja.json"), ja);

  Object.keys(languages).forEach((language) => {
    const file = path.join(localeDir, `${language}.json`);
    const current = readJson(file);
    const next = {};

    texts.forEach((text) => {
      next[text] = current[text] || "";
    });

    writeJson(file, next);
  });

  console.log(`Extracted ${texts.length} i18n strings.`);
};

const chunk = (items, size) => {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

const callOpenAi = async (languageName, entries) => {
  const response = await fetch(openAiEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openAiModel,
      input: [
        {
          role: "system",
          content: [
            "You translate Japanese website and menu copy for nanacha, a tea and tapioca drink shop in Fukuoka.",
            "Translate naturally for customers, not literally word by word.",
            "Preserve the brand name nanacha, prices, addresses, times, pickup codes, HTML-free plain text, and menu intent.",
            "Keep drink names concise and menu-friendly.",
            "Return only valid JSON that matches the schema.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            target_language: languageName,
            entries,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "nanacha_translations",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["translations"],
            properties: {
              translations: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "text"],
                  properties: {
                    id: { type: "string" },
                    text: { type: "string" },
                  },
                },
              },
            },
          },
          strict: true,
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenAI translation failed: ${response.status}`);
  }

  const parsed = JSON.parse(payload.output_text || "{}");
  return Object.fromEntries(
    (parsed.translations || [])
      .filter((item) => item && typeof item.id === "string" && typeof item.text === "string")
      .map((item) => [item.id, normalize(item.text)]),
  );
};

const translateOpenAi = async () => {
  extract();

  if (!process.env.OPENAI_API_KEY) {
    console.log("OPENAI_API_KEY is not set. Locale files were updated, but no OpenAI translations were generated.");
    return;
  }

  const selectedLanguages = Object.entries(openAiLanguages).filter(
    ([language]) => !openAiTargetLanguages.length || openAiTargetLanguages.includes(language),
  );

  for (const [language, languageName] of selectedLanguages) {
    const file = path.join(localeDir, `${language}.json`);
    const dictionary = readJson(file);
    const missing = Object.entries(dictionary)
      .filter(([, value]) => !value)
      .map(([source], index) => ({
        id: `item_${index}`,
        source,
      }));

    if (!missing.length) {
      console.log(`${language}: no missing translations.`);
      continue;
    }

    console.log(`${language}: translating ${missing.length} missing strings with ${openAiModel}.`);

    for (const batch of chunk(missing, openAiBatchSize)) {
      const translations = await callOpenAi(
        languageName,
        batch.map((entry) => ({ id: entry.id, text: entry.source })),
      );

      batch.forEach((entry) => {
        const translated = translations[entry.id];

        if (translated) {
          dictionary[entry.source] = translated;
        }
      });

      writeJson(file, dictionary);
      console.log(`${language}: saved ${Object.keys(translations).length} translations.`);
    }
  }
};

const command = process.argv[2] || "extract";

if (command === "extract") {
  extract();
} else if (command === "translate:openai") {
  translateOpenAi().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else {
  console.error(`Unknown command: ${command}`);
  process.exitCode = 1;
}
