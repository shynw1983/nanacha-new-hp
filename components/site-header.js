"use client";

import { useEffect } from "react";
import { useI18n } from "./i18n-provider";

export function SiteHeader({ menu = false, shops = false }) {
  const { language, setLanguage, t } = useI18n();

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

  return (
    <header className="site-header" data-header>
      <a className="brand" href={menu ? "/#top" : "#top"} aria-label={t("nanacha ホーム")}>
        <img className="brand-logo" src="/assets/nanacha-logo.png" alt="nanacha" />
      </a>
      <nav className="nav-links" aria-label={t("メインナビゲーション")}>
        <a href="/menu" aria-current={menu ? "page" : undefined}>
          {t("メニュー")}
        </a>
        <a href="/shops" aria-current={shops ? "page" : undefined}>
          {t("店舗")}
        </a>
        {menu ? (
          <>
            <a href="/#access">{t("アクセス")}</a>
            <a href="/#reserve">{t("予約")}</a>
          </>
        ) : (
          <>
            <a href="#order">{t("注文方法")}</a>
            <a href="#access">{t("アクセス")}</a>
            <a href="#faq">FAQ</a>
            <a href="#reserve">{t("予約")}</a>
          </>
        )}
      </nav>
      <div className="header-tools">
        <label className="language-picker">
          <span>Language</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Language">
            <option value="ja">日本語</option>
            <option value="en">English</option>
            <option value="zh">中文</option>
            <option value="ko">한국어</option>
          </select>
        </label>
        <a className="header-action" href={menu ? "/#reserve" : "#reserve"}>
          {t("受け取り予約")}
        </a>
      </div>
    </header>
  );
}
