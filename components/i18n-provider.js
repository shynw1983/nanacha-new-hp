"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LANGUAGE_STORAGE_KEY = "nanacha-language";
const LOCALE_CACHE_VERSION = "20260518-react-i18n";
const LANGUAGE_META = {
  ja: { htmlLang: "ja" },
  en: { htmlLang: "en" },
  zh: { htmlLang: "zh-Hans" },
  ko: { htmlLang: "ko" },
};
const I18nContext = createContext({
  language: "ja",
  setLanguage: () => {},
  t: (value) => value,
});

const translateText = (value, dictionary) => {
  if (typeof value !== "string" || !value) {
    return value;
  }

  const exact = dictionary[value];
  if (exact) {
    return exact;
  }

  let translated = value;
  Object.entries(dictionary)
    .filter(([source, target]) => source.length > 3 && target && translated.includes(source))
    .sort((a, b) => b[0].length - a[0].length)
    .forEach(([source, target]) => {
      translated = translated.split(source).join(target);
    });

  return translated;
};

export function I18nProvider({ children, initialLanguage = "ja", initialDictionary = {} }) {
  const [language, setLanguage] = useState(initialLanguage);
  const [dictionary, setDictionary] = useState(initialDictionary);

  useEffect(() => {
    document.documentElement.lang = LANGUAGE_META[language]?.htmlLang || "ja";

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Continue without persistence.
    }

    if (language === "ja") {
      setDictionary({});
      return;
    }

    let active = true;
    const storageKey = `nanacha-dictionary-${LOCALE_CACHE_VERSION}-${language}`;

    const load = async () => {
      let cachedDictionary = null;

      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          cachedDictionary = JSON.parse(cached);
          if (active) setDictionary(cachedDictionary);
        }
      } catch {
        // Fetch a fresh copy below.
      }

      try {
        const response = await fetch(`/locales/${language}.json`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          if (active && !cachedDictionary) {
            setDictionary({});
          }
          return;
        }

        const nextDictionary = await response.json();

        if (active) {
          setDictionary(nextDictionary);
        }

        try {
          if (Object.keys(nextDictionary).length) {
            localStorage.setItem(storageKey, JSON.stringify(nextDictionary));
          }
        } catch {
          // Ignore cache failures.
        }
      } catch {
        if (active && !cachedDictionary) {
          setDictionary({});
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (text) => translateText(text, dictionary),
    }),
    [dictionary, language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

export const localizeValue = (value, t) => {
  if (Array.isArray(value)) {
    return value.map((item) => localizeValue(item, t));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeValue(item, t)]));
  }

  return typeof value === "string" ? t(value) : value;
};
