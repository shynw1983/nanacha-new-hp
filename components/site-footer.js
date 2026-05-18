"use client";

import { useI18n } from "./i18n-provider";
import { localizedPath } from "./localized-path";
import siteLinks from "../data/site-links";

export function SiteFooter() {
  const { language, t } = useI18n();

  return (
    <footer>
      <p>{t("nanacha · tapioca & more...")}</p>
      <div className="footer-links" aria-label="外部リンク">
        <a href={localizedPath(language, "/shops")}>{t("店舗一覧を見る")}</a>
        <a href={siteLinks.instagram} target="_blank" rel="noreferrer">
          Instagram
        </a>
      </div>
      <p>{t("福岡発のティースタンド")}</p>
    </footer>
  );
}
