"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "./i18n-provider";
import { localizedPath } from "./localized-path";

export function SiteHeader({ menu = false, shops = false }) {
  const { language, setLanguage, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const isInteriorPage = menu || shops;
  const homeBase = localizedPath(language, "/");
  const homeHref = isInteriorPage ? `${homeBase}#top` : "#top";
  const orderHref = isInteriorPage ? `${homeBase}#order` : "#order";
  const accessHref = isInteriorPage ? `${homeBase}#access` : "#access";
  const faqHref = isInteriorPage ? `${homeBase}#faq` : "#faq";
  const reserveHref = isInteriorPage ? `${homeBase}#reserve` : "#reserve";

  useEffect(() => {
    const syncHeader = () => {
      const header = document.querySelector("[data-header]");
      if (header) {
        header.style.boxShadow =
          window.scrollY > 12 ? "0 12px 36px rgba(0, 0, 0, 0.05)" : "none";
      }
    };

    window.addEventListener("scroll", syncHeader, { passive: true });
    syncHeader();
    return () => window.removeEventListener("scroll", syncHeader);
  }, []);

  const changeLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);

    const currentLanguagePrefix = ["/en", "/zh", "/ko"].find(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    const basePath = currentLanguagePrefix ? pathname.slice(currentLanguagePrefix.length) || "/" : pathname;
    router.push(localizedPath(nextLanguage, basePath));
  };

  return (
    <header className="site-header" data-header>
      <a className="brand" href={homeHref} aria-label={t("nanacha ホーム")}>
        <img className="brand-logo" src="/assets/nanacha-logo.png" alt="nanacha" />
      </a>
      <nav className="nav-links" aria-label={t("メインナビゲーション")}>
        <a href={localizedPath(language, "/menu")} aria-current={menu ? "page" : undefined}>
          {t("メニュー")}
        </a>
        <a href={localizedPath(language, "/shops")} aria-current={shops ? "page" : undefined}>
          {t("店舗")}
        </a>
        <a href={orderHref}>{t("注文方法")}</a>
        <a href={accessHref}>{t("アクセス")}</a>
        <a href={faqHref}>FAQ</a>
        <a href={reserveHref}>{t("予約")}</a>
      </nav>
      <div className="header-tools">
        <label className="language-picker">
          <span>Language</span>
          <select value={language} onChange={(event) => changeLanguage(event.target.value)} aria-label="Language">
            <option value="ja">日本語</option>
            <option value="en">English</option>
            <option value="zh">中文</option>
            <option value="ko">한국어</option>
          </select>
        </label>
        <a className="header-action" href={reserveHref}>
          {t("受け取り予約")}
        </a>
      </div>
    </header>
  );
}
