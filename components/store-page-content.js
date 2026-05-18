"use client";

import { localizeValue, useI18n } from "./i18n-provider";
import { StoreDetail } from "./store-detail";

export function StorePageContent({ store }) {
  const { t } = useI18n();
  const localizedStore = localizeValue(store, t);

  return (
    <main className="store-page">
      <section className="menu-hero store-page-hero">
        <p className="eyebrow">{localizedStore.statusLabel}</p>
        <h1>{localizedStore.name}</h1>
        <p>{localizedStore.summary}</p>
      </section>
      <StoreDetail store={localizedStore} />
      <section className="store-page-links">
        <a className="text-link" href="/shops">
          ← {t("店舗一覧へ戻る")}
        </a>
      </section>
    </main>
  );
}
