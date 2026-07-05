"use client";

import { useI18n } from "./i18n-provider";
import { localizedPath } from "./localized-path";
import siteLinks from "../data/site-links";

const footerLogoPath = "/assets/nanacha-logo-20211101.png";

export function SiteFooter({ sections = [] }) {
  const { language, t } = useI18n();
  const footer = sections.find((section) => section.sectionKey === "footer") || {};

  return (
    <footer>
      <div className="footer-brand">
        <img src={footerLogoPath} alt={footer.imageAlt || "nanacha"} />
        <p>{t(footer.title || "nanacha · tapioca & more...")}</p>
      </div>
      <div className="footer-links" aria-label="外部リンク">
        <a href={localizedPath(language, footer.actionUrl || "/shops")}>{t(footer.actionLabel || "店舗一覧を見る")}</a>
        <a href={siteLinks.instagram} target="_blank" rel="noreferrer">
          Instagram
        </a>
      </div>
      <p>{t(footer.body || "福岡発のティースタンド")}</p>
    </footer>
  );
}
