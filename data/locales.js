const localeConfig = {
  ja: { htmlLang: "ja", pathPrefix: "" },
  en: { htmlLang: "en", pathPrefix: "/en" },
  zh: { htmlLang: "zh-Hans", pathPrefix: "/zh" },
  "zh-Hant": { htmlLang: "zh-Hant", pathPrefix: "/zh-Hant" },
  ko: { htmlLang: "ko", pathPrefix: "/ko" },
  vi: { htmlLang: "vi", pathPrefix: "/vi" },
  ne: { htmlLang: "ne", pathPrefix: "/ne" },
};

const supportedLocales = Object.keys(localeConfig);
const translatedLocales = supportedLocales.filter((locale) => locale !== "ja");

const withLocalePath = (locale, path = "/") => {
  const normalizedPath = path === "/" ? "" : path;
  return `${localeConfig[locale]?.pathPrefix || ""}${normalizedPath}` || "/";
};

const languageAlternates = (path = "/") =>
  Object.fromEntries(supportedLocales.map((locale) => [localeConfig[locale].htmlLang, withLocalePath(locale, path)]));

module.exports = {
  languageAlternates,
  localeConfig,
  supportedLocales,
  translatedLocales,
  withLocalePath,
};
