import { useI18n } from "./i18n-provider";

export function StoreDetail({ store, headingLevel = "h1" }) {
  const { t } = useI18n();
  const Heading = headingLevel;

  return (
    <section className="access-section store-detail-section" aria-labelledby={`store-${store.id}-title`}>
      <div className="access-copy">
        <p className="eyebrow">shop map</p>
        <Heading id={`store-${store.id}-title`} className="heading-with-decor">
          {store.name}
          <img src="/assets/decor/tail.png" alt="" aria-hidden="true" />
        </Heading>
        <address>
          {store.postalCode} {store.address}
        </address>
        <p>{store.intro}</p>
        <dl className="shop-info">
          <div>
            <dt>{t("営業時間")}</dt>
            <dd>{store.hours}</dd>
          </div>
          <div>
            <dt>{t("定休日")}</dt>
            <dd>{store.closedDays}</dd>
          </div>
          <div>
            <dt>{t("最寄り")}</dt>
            <dd>{store.nearestStation}</dd>
          </div>
          <div>
            <dt>{t("利用方法")}</dt>
            <dd>{store.usage}</dd>
          </div>
          <div>
            <dt>{t("支払い")}</dt>
            <dd>{store.paymentNote}</dd>
          </div>
        </dl>
        <div className="access-actions">
          <a className="primary-button" href={store.googleMapsUrl} target="_blank" rel="noreferrer">
            {t("google mapsで開く")}
          </a>
          {store.uberEatsUrl ? (
            <a className="ghost-button uber-eats-button" href={store.uberEatsUrl} target="_blank" rel="noreferrer">
              Uber Eats
            </a>
          ) : null}
        </div>
      </div>
      <div className="map-card" aria-label={`${store.name} 地図`}>
        <iframe
          title={`${store.name} google map`}
          src={store.googleMapsEmbedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}
