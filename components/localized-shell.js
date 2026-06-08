import { I18nProvider } from "./i18n-provider";

const dictionaries = {
  en: require("../public/locales/en.json"),
  ja: require("../public/locales/ja.json"),
  ko: require("../public/locales/ko.json"),
  zh: require("../public/locales/zh.json"),
  vi: require("../public/locales/vi.json"),
  ne: require("../public/locales/ne.json"),
};

export function LocalizedShell({ language, children }) {
  return (
    <I18nProvider initialLanguage={language} initialDictionary={dictionaries[language] || {}}>
      {children}
    </I18nProvider>
  );
}
