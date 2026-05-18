"use client";

import { localizeValue, useI18n } from "./i18n-provider";
import { localizedPath } from "./localized-path";

export function StoreListContent({ stores }) {
  const { language, t } = useI18n();
  const localizedStores = localizeValue(stores, t);

  return (
    <main className="stores-page">
      <section className="menu-hero stores-hero">
        <p className="eyebrow">our shops</p>
        <h1>{t("店舗紹介")}</h1>
        <p>{t("nanacha の各店舗をご案内します。住所、営業時間、受け取り方法は店舗ごとにご確認ください。")}</p>
      </section>
      <section className="stores-section stores-page-list" aria-label={t("店舗一覧")}>
        <div className="store-list">
          {localizedStores.map((store) => (
            <article className={`store-card${store.address ? "" : " is-upcoming"}`} key={store.id}>
              <div className="store-card-media">
                {store.storefrontImageUrl ? (
                  <img className="store-photo" src={store.storefrontImageUrl.startsWith("/") ? store.storefrontImageUrl : `/${store.storefrontImageUrl}`} alt={store.storefrontImageAlt || store.name} />
                ) : (
                  <div className="store-photo-placeholder" aria-hidden="true" />
                )}
              </div>
              <div className="store-card-copy">
                <p className="store-status">{store.statusLabel}</p>
                <h2>{store.name}</h2>
                <p>{store.summary}</p>
                {store.address ? (
                  <a className="text-link" href={localizedPath(language, `/shops/${store.id}`)}>
                    {t("店舗情報を見る")}
                  </a>
                ) : (
                  <span className="store-link-spacer" aria-hidden="true" />
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
