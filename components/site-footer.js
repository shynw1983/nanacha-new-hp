"use client";

import { useI18n } from "./i18n-provider";
import siteLinks from "../data/site-links";

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer>
      <p>{t("nanacha · tapioca & more...")}</p>
      <div className="footer-links" aria-label="外部リンク">
        <a href={siteLinks.instagram} target="_blank" rel="noreferrer">
          Instagram
        </a>
        <a href={siteLinks.uberEats} target="_blank" rel="noreferrer">
          Uber Eats
        </a>
      </div>
      <p>{t("福岡市中央区清川2-9-6 · online pickup")}</p>
    </footer>
  );
}
