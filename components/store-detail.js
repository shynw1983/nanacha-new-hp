import { useI18n } from "./i18n-provider";
import { PaymentBadges } from "./payment-badges";

const normalizeAssetUrl = (url = "") =>
  url.startsWith("http") || url.startsWith("/") ? url : `/${url}`;

export function StoreDetail({ store, headingLevel = "h1", reserveHref = "/#reserve" }) {
  const { t } = useI18n();
  const Heading = headingLevel;

  return (
    <section className="access-section store-detail-section" aria-labelledby={`store-${store.id}-title`}>
      <p className="eyebrow store-detail-eyebrow">shop map</p>
      <Heading id={`store-${store.id}-title`} className="heading-with-decor store-detail-title">
        {store.name}
        <img src="/assets/decor/wave.png" alt="" aria-hidden="true" />
      </Heading>
      <address className="store-detail-address">
        {store.postalCode} {store.address}
      </address>
      <p className="store-detail-intro">{store.intro}</p>
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
          <dd className="payment-methods">
            <PaymentBadges />
            <span>{store.paymentNote}</span>
          </dd>
        </div>
      </dl>
      <div className="store-detail-media" aria-label={store.storefrontImageAlt || store.name}>
        {store.storefrontImageUrl ? (
          <img src={normalizeAssetUrl(store.storefrontImageUrl)} alt={store.storefrontImageAlt || store.name} />
        ) : (
          <iframe
            title={`${store.name} google map`}
            src={store.googleMapsEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </div>
      <div className="access-actions">
        <a className="primary-button" href={store.googleMapsUrl} target="_blank" rel="noreferrer">
          {t("google mapsで開く")}
        </a>
        <a className="ghost-button" href={reserveHref}>
          {t("受け取り予約へ")}
        </a>
        {store.uberEatsUrl ? (
          <a className="ghost-button uber-eats-button" href={store.uberEatsUrl} target="_blank" rel="noreferrer">
            Uber Eats
          </a>
        ) : null}
      </div>
    </section>
  );
}
