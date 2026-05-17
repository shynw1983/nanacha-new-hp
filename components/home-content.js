"use client";

import { HeroCarousel } from "./hero-carousel";
import { localizeValue, useI18n } from "./i18n-provider";
import { RevealOnScroll } from "./reveal-on-scroll";

const normalizeAssetUrl = (url = "") =>
  url.startsWith("http") || url.startsWith("/") || url.startsWith("#") ? url : `/${url}`;
const formatPrice = (price) => `¥${price.toLocaleString("ja-JP")}`;

const cardsBySection = (homepage, section) => homepage.cards.filter((card) => card.section === section);

export function HomeContent({ homepage, menu }) {
  const { t } = useI18n();
  const localizedHomepage = localizeValue(homepage, t);
  const localizedMenu = localizeValue(menu, t);
  const { settings } = localizedHomepage;
  const recommended = localizedMenu.drinks.filter((drink) => drink.isRecommended);
  const picks = (recommended.length ? recommended : localizedMenu.drinks).slice(0, 4);
  const primaryStore = localizedHomepage.stores.find((store) => store.address);

  return (
    <>
      <RevealOnScroll />
      <section className="hero" aria-labelledby="hero-title" data-react-homepage>
        <div className="hero-copy" data-reveal>
          <p className="eyebrow eyebrow-with-decor">
            <img src="/assets/decor/tapioca-three.png" alt="" aria-hidden="true" />
            {settings.heroEyebrow}
          </p>
          <h1 id="hero-title" className="title-with-decor">
            {settings.heroTitle}
            <img className="title-decor" src="/assets/decor/dog-sparkle.png" alt="" aria-hidden="true" />
          </h1>
          <p className="hero-text">{settings.heroDescription}</p>
          <div className="hero-actions">
            <a className="primary-button" href={normalizeAssetUrl(settings.primaryButtonUrl)}>
              {settings.primaryButtonLabel}
            </a>
            <a className="ghost-button" href={settings.secondaryButtonUrl}>
              {settings.secondaryButtonLabel}
            </a>
          </div>
          <div className="hero-metrics" aria-label="店舗情報">
            <span>
              <strong data-menu-count>{menu.drinks.length}</strong> menu drinks
            </span>
            <span>
              <strong>0%</strong> {t("甘さゼロ対応")}
            </span>
            <span>
              <strong>pickup</strong> {t("予約対応")}
            </span>
          </div>
        </div>
        <HeroCarousel slides={localizedHomepage.slides} />
      </section>

      <section className="menu-section" id="menu" aria-labelledby="menu-title" data-reveal>
        <div className="section-heading">
          <div>
            <p className="eyebrow">real menu picks</p>
            <h2 id="menu-title" className="heading-with-decor">
              {t("人気メニュー")}
              <img src="/assets/decor/tapioca-two.png" alt="" aria-hidden="true" />
            </h2>
          </div>
          <a className="text-link" href="/menu">
            {t("全メニューを見る")}
          </a>
        </div>
        <div className="menu-grid">
          {picks.map((drink, index) => (
            <article className={`drink-card${drink.isFeatured || index === 0 ? " featured" : ""}`} key={drink.id}>
              {drink.imageUrl ? <img className="drink-photo" src={normalizeAssetUrl(drink.imageUrl)} alt={drink.name} /> : null}
              <div>
                <p className="drink-tag">{localizedMenu.categories.find((category) => category.id === drink.category)?.label}</p>
                <h3>{drink.name}</h3>
                {drink.description ? <p>{drink.description}</p> : null}
              </div>
              <span>{formatPrice(drink.price)}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="order-section" id="order" aria-labelledby="order-title" data-reveal>
        <div className="section-heading">
          <div>
            <p className="eyebrow">how to order</p>
            <h2 id="order-title" className="heading-with-decor">
              {t("はじめての方へ")}
              <img src="/assets/decor/tapioca-one.png" alt="" aria-hidden="true" />
            </h2>
          </div>
        </div>
        <div className="step-grid">
          {cardsBySection(localizedHomepage, "orderSteps").map((card) => (
            <article key={card.id}>
              <span>{card.badge}</span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="recommend-section" id="recommend" aria-labelledby="recommend-title" data-reveal>
        <div className="section-heading">
          <div>
            <p className="eyebrow">drink guide</p>
            <h2 id="recommend-title" className="heading-with-decor">
              {t("おすすめの選び方")}
              <img src="/assets/decor/heart-fill.png" alt="" aria-hidden="true" />
            </h2>
          </div>
          <a className="text-link" href="/menu">
            {t("メニューで探す")}
          </a>
        </div>
        <div className="guide-grid">
          {cardsBySection(localizedHomepage, "recommendGuide").map((card) => (
            <article key={card.id}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="season-section" aria-labelledby="season-title" data-reveal>
        <div className="season-copy">
          <p className="eyebrow">{settings.seasonEyebrow}</p>
          <h2 id="season-title" className="heading-with-decor">
            {settings.seasonTitle}
            <img src="/assets/decor/sparkle.png" alt="" aria-hidden="true" />
          </h2>
          <p>{settings.seasonIntro}</p>
        </div>
        <div className="season-list">
          {cardsBySection(localizedHomepage, "seasonalPicks").map((card) => (
            <article key={card.id}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="story-section" aria-labelledby="story-title" data-reveal>
        <div className="section-heading">
          <div>
            <p className="eyebrow">our tea stand</p>
            <h2 id="story-title" className="heading-with-decor">
              {t("nanachaのこだわり")}
              <img src="/assets/decor/paw.png" alt="" aria-hidden="true" />
            </h2>
          </div>
        </div>
        <div className="story-grid">
          {cardsBySection(localizedHomepage, "story").map((card) => (
            <article key={card.id}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="stores-section" aria-labelledby="stores-title" data-reveal>
        <div className="section-heading">
          <div>
            <p className="eyebrow">our shops</p>
            <h2 id="stores-title" className="heading-with-decor">
              {t("店舗紹介")}
              <img src="/assets/decor/dog-smile.png" alt="" aria-hidden="true" />
            </h2>
          </div>
        </div>
        <div className="store-list">
          {localizedHomepage.stores.map((store) => (
            <article className={`store-card${store.id === "next-store" ? " is-upcoming" : ""}`} key={store.id}>
              <p className="store-status">{store.statusLabel}</p>
              <h3>{store.name}</h3>
              <p>{store.summary}</p>
              {store.address ? (
                <a className="text-link" href="#access">
                  {t("店舗情報を見る")}
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {primaryStore ? (
        <section className="access-section" id="access" aria-labelledby="access-title" data-reveal>
          <div className="access-copy">
            <p className="eyebrow">shop map</p>
            <h2 id="access-title" className="heading-with-decor">
              {primaryStore.name}
              <img src="/assets/decor/tail.png" alt="" aria-hidden="true" />
            </h2>
            <address>
              {primaryStore.postalCode} {primaryStore.address}
            </address>
            <p>{primaryStore.intro}</p>
            <dl className="shop-info">
              <div>
                <dt>{t("営業時間")}</dt>
                <dd>{primaryStore.hours}</dd>
              </div>
              <div>
                <dt>{t("定休日")}</dt>
                <dd>{primaryStore.closedDays}</dd>
              </div>
              <div>
                <dt>{t("最寄り")}</dt>
                <dd>{primaryStore.nearestStation}</dd>
              </div>
              <div>
                <dt>{t("利用方法")}</dt>
                <dd>{primaryStore.usage}</dd>
              </div>
              <div>
                <dt>{t("支払い")}</dt>
                <dd>{primaryStore.paymentNote}</dd>
              </div>
            </dl>
            <div className="access-actions">
              <a className="primary-button" href={primaryStore.googleMapsUrl} target="_blank" rel="noreferrer">
                {t("google mapsで開く")}
              </a>
              <a className="ghost-button" href="#reserve">
                {t("受け取り予約へ")}
              </a>
              {primaryStore.uberEatsUrl ? (
                <a
                  className="ghost-button uber-eats-button"
                  href={primaryStore.uberEatsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Uber Eats
                </a>
              ) : null}
            </div>
          </div>
          <div className="map-card" aria-label="nanacha 福岡清川店 地図">
            <iframe
              title="nanacha 福岡清川店 google map"
              src={primaryStore.googleMapsEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      ) : null}

      <section className="faq-section" id="faq" aria-labelledby="faq-title" data-reveal>
        <div className="section-heading">
          <div>
            <p className="eyebrow">faq</p>
            <h2 id="faq-title" className="heading-with-decor">
              {t("よくある質問")}
              <img src="/assets/decor/question-mark.svg" alt="" aria-hidden="true" />
            </h2>
          </div>
        </div>
        <div className="faq-grid">
          {localizedHomepage.faqs.map((faq) => (
            <details key={faq.id}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
