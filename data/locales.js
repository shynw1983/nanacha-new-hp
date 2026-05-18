const localeConfig = {
  ja: { htmlLang: "ja", pathPrefix: "" },
  en: { htmlLang: "en", pathPrefix: "/en" },
  zh: { htmlLang: "zh-Hans", pathPrefix: "/zh" },
  ko: { htmlLang: "ko", pathPrefix: "/ko" },
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
