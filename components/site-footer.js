"use client";

import { useI18n } from "./i18n-provider";

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer>
      <p>{t("nanacha · tapioca & more...")}</p>
      <p>{t("福岡市中央区清川2-9-6 · online pickup")}</p>
    </footer>
  );
}
