"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "./i18n-provider";
import { localizedPath } from "./localized-path";
import { buildMemberCardUrl, consumeMemberHandoff, memberPreferredLanguage } from "./member-session";

const languagePrefixes = ["/en", "/zh", "/zh-Hant", "/ko", "/vi", "/ne"];
const compactLanguageLabels = {
  ja: "JP",
  en: "EN",
  zh: "简",
  "zh-Hant": "繁",
  ko: "KO",
  vi: "VI",
  ne: "NE",
};

export function SiteHeader({ menu = false, shops = false, reservationHref = "" }) {
  const { language, setLanguage, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const isInteriorPage = menu || shops;
  const homeBase = localizedPath(language, "/");
  const homeHref = isInteriorPage ? `${homeBase}#top` : "#top";
  const orderHref = isInteriorPage ? `${homeBase}#order` : "#order";
  const faqHref = isInteriorPage ? `${homeBase}#faq` : "#faq";
  const reserveHref = reservationHref || localizedPath(language, "/shops");

  useEffect(() => {
    const root = document.documentElement;
    const header = document.querySelector("[data-header]");
    const syncHeader = () => {
      if (header) {
        header.style.boxShadow =
          window.scrollY > 12 ? "0 12px 36px rgba(0, 0, 0, 0.05)" : "none";
        root.style.setProperty(
          "--site-header-height",
          `${Math.ceil(header.getBoundingClientRect().height)}px`,
        );
      }
    };
    const resizeObserver =
      header && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(syncHeader)
        : null;

    window.addEventListener("scroll", syncHeader, { passive: true });
    window.addEventListener("resize", syncHeader);
    if (header && resizeObserver) resizeObserver.observe(header);
    syncHeader();
    return () => {
      window.removeEventListener("scroll", syncHeader);
      window.removeEventListener("resize", syncHeader);
      resizeObserver?.disconnect();
    };
  }, []);

  const [memberHref, setMemberHref] = useState("https://foundr1.jp/member");

  useEffect(() => {
    setMemberHref(buildMemberCardUrl());
  }, [pathname]);

  const changeLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);

    const currentLanguagePrefix = languagePrefixes.find(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    const basePath = currentLanguagePrefix ? pathname.slice(currentLanguagePrefix.length) || "/" : pathname;
    const query = window.location.search;
    const hash = window.location.hash;
    router.push(`${localizedPath(nextLanguage, basePath)}${query}${hash}`);
  };

  useEffect(() => {
    consumeMemberHandoff()
      .then((profile) => {
        const nextLanguage = memberPreferredLanguage(profile);
        if (nextLanguage && nextLanguage !== language) changeLanguage(nextLanguage);
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <header className="site-header" data-header>
      <a className="brand" href={homeHref} aria-label={t("nanacha ホーム")}>
        <img className="brand-logo" src="/assets/nanacha-logo-20211101.png" alt="nanacha" />
      </a>
      <nav className="nav-links" aria-label={t("メインナビゲーション")}>
        <a href={localizedPath(language, "/menu")} aria-current={menu ? "page" : undefined}>
          {t("メニュー")}
        </a>
        <a href={localizedPath(language, "/shops")} aria-current={shops ? "page" : undefined}>
          {t("店舗")}
        </a>
        <a href={orderHref}>{t("注文方法")}</a>
        <a href={faqHref}>FAQ</a>
        <a href={reserveHref}>{t("予約")}</a>
      </nav>
      <div className="header-tools">
        <a
          className="member-icon-link"
          href={memberHref}
          aria-label={t("会員ログイン")}
          title={t("会員ログイン")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z" />
            <path d="M4.8 20.2c.7-3.4 3.5-5.6 7.2-5.6s6.5 2.2 7.2 5.6" />
          </svg>
        </a>
        <label className="language-picker">
          <span className="language-picker-label">Language</span>
          <span className="language-picker-current" aria-hidden="true">
            {compactLanguageLabels[language] || language.toUpperCase()}
          </span>
          <select value={language} onChange={(event) => changeLanguage(event.target.value)} aria-label="Language">
            <option value="ja">日本語</option>
            <option value="en">English</option>
            <option value="zh">简体中文</option>
            <option value="zh-Hant">繁體中文</option>
            <option value="ko">한국어</option>
            <option value="vi">Tiếng Việt</option>
            <option value="ne">नेपाली</option>
          </select>
        </label>
        <a className="header-action" href={reserveHref}>
          <span className="header-action-full">{t("受け取り予約")}</span>
          <span className="header-action-short">{t("予約")}</span>
        </a>
      </div>
    </header>
  );
}
