import { I18nProvider } from "./i18n-provider";
const { localeConfig } = require("../data/locales");

const dictionaries = {
  en: require("../public/locales/en.json"),
  ja: require("../public/locales/ja.json"),
  ko: require("../public/locales/ko.json"),
  zh: require("../public/locales/zh.json"),
  "zh-Hant": require("../public/locales/zh-Hant.json"),
  vi: require("../public/locales/vi.json"),
  ne: require("../public/locales/ne.json"),
};

export function LocalizedShell({ language, children }) {
  const htmlLang = localeConfig[language]?.htmlLang || "ja";

  return (
    <I18nProvider initialLanguage={language} initialDictionary={dictionaries[language] || {}}>
      <div className="localized-shell" lang={htmlLang}>
        {children}
      </div>
    </I18nProvider>
  );
}
