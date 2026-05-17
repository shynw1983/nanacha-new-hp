const fs = require("fs");
const path = require("path");
const localMenu = require("../menu-data.js");
const localDescriptions = require("../data/menu-descriptions.js");
const localCategoryNotes = require("../data/category-notes.js");
const { getHomepageData } = require("../server/homepage-source");

const root = path.resolve(__dirname, "..");
const localeDir = path.join(root, "public", "locales");

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
  "nanacha ホーム",
  "メインナビゲーション",
  "メニュー",
  "アクセス",
  "予約",
  "注文方法",
  "受け取り予約",
  "甘さゼロ対応",
  "予約対応",
  "人気メニュー",
  "全メニューを見る",
  "はじめての方へ",
  "おすすめの選び方",
  "メニューで探す",
  "nanachaのこだわり",
  "店舗紹介",
  "店舗情報を見る",
  "営業時間",
  "定休日",
  "最寄り",
  "利用方法",
  "支払い",
  "google mapsで開く",
  "受け取り予約へ",
  "よくある質問",
  "店舗",
  "カテゴリー",
  "ドリンク",
  "サイズ",
  "温度",
  "甘さ",
  "氷の量",
  "オプション",
  "受け取り時間",
  "トッピング",
  "Squareで注文・支払い",
  "福岡清川店で楽しめるタピオカミルク、フラッペ、チーズティー、スムージー、ティー、コーヒーまで。 サイズ・甘さ・氷の量・トッピングを選んで、自分好みの一杯に。",
  "アレルギー・カフェインについて",
  "アレルギー",
  "牛乳、豆乳、ナッツ、ごま、チョコレート、オレオ、ホイップ、チーズフォームなどを使用する商品があります。アレルギーをお持ちの方は注文前にスタッフへご確認ください。",
  "カフェイン",
  "紅茶、緑茶、ほうじ茶、ジャスミン茶、コーヒーを使う商品にはカフェインが含まれる場合があります。デカフェ変更は対応可能な商品で選べます。",
  "甘さ・氷",
  "甘さゼロ、少なめ、ふつう、多め、氷少なめ、氷抜きに対応しています。すっきり飲みたい方は甘さ少なめがおすすめです。",
  "合計",
  "決済画面を作成中...",
  "Square設定が未完了です。店舗側でVercelの環境変数を設定してください。",
  "決済画面を作成できませんでした。時間をおいて再度お試しください。",
  "お支払いありがとうございます。店頭でお名前とSquareの決済画面をご提示ください。",
];

const normalize = (text = "") => String(text).replace(/\s+/g, " ").trim();

const shouldTranslate = (text) => {
  const value = normalize(text);

  if (!value || value.length < 2) {
    return false;
  }

  if (/^[\d\s:.,+¥%()/-]+$/.test(value)) {
    return false;
  }

  if (/^(https?:|#|\/)/.test(value) || /^[a-z0-9-]+$/.test(value)) {
    return false;
  }

  return /[A-Za-z\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(value);
};

const collectMenuTexts = async () => {
  const texts = [];
  const push = (text) => {
    if (shouldTranslate(text)) {
      texts.push(normalize(text));
    }
  };
  const menuData = {
    ...localMenu,
    categories: localMenu.categories.map((category) => ({
      ...category,
      note: localCategoryNotes[category.id] || "",
    })),
    drinks: localMenu.drinks.map((drink) => ({
      ...drink,
      description: localDescriptions[drink.name] || "",
    })),
  };

  menuData.categories.forEach((category) => {
    push(category.label);
    push(category.note || "");
  });
  menuData.drinks.forEach((drink) => {
    push(drink.name);
    push(drink.description || "");
  });
  menuData.sizes.forEach((size) => push(size.label));
  menuData.sweetness.forEach(push);
  menuData.ice.forEach(push);
  push(menuData.hotIce);
  menuData.options.forEach((option) => push(option.label));
  menuData.toppings.forEach((topping) => push(topping.label));
  extraTexts.forEach(push);

  return texts;
};

const collectHomepageTexts = (homepageData) => {
  const texts = [];
  const push = (text) => {
    if (shouldTranslate(text)) {
      texts.push(normalize(text));
    }
  };

  Object.values(homepageData.settings || {}).forEach(push);
  (homepageData.slides || []).forEach((slide) => {
    push(slide.title);
    push(slide.caption);
    push(slide.altText);
  });
  (homepageData.cards || []).forEach((card) => {
    push(card.badge);
    push(card.title);
    push(card.body);
  });
  (homepageData.stores || []).forEach((store) => {
    Object.values(store).forEach(push);
  });
  (homepageData.faqs || []).forEach((faq) => {
    push(faq.question);
    push(faq.answer);
  });

  return texts;
};

const getSourceTexts = async () => {
  const homepageData = await getHomepageData();
  return Array.from(new Set([...extraTexts, ...collectHomepageTexts(homepageData), ...(await collectMenuTexts())])).sort();
};

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

const extract = async () => {
  const texts = await getSourceTexts();
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

const getOpenAiOutputText = (payload) => {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .filter(Boolean)
    .join("\n");
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

  const outputText = getOpenAiOutputText(payload);

  if (!outputText) {
    throw new Error("OpenAI response did not include output text.");
  }

  const parsed = JSON.parse(outputText);
  const translations = Object.fromEntries(
    (parsed.translations || [])
      .filter((item) => item && typeof item.id === "string" && typeof item.text === "string")
      .map((item) => [item.id, normalize(item.text)]),
  );

  if (!Object.keys(translations).length) {
    throw new Error("OpenAI response included no translations.");
  }

  return translations;
};

const translateOpenAi = async () => {
  await extract();

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
  extract().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else if (command === "translate:openai") {
  translateOpenAi().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else {
  console.error(`Unknown command: ${command}`);
  process.exitCode = 1;
}
