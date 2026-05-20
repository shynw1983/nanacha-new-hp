"use client";

import { HeroCarousel } from "./hero-carousel";
import { localizeValue, useI18n } from "./i18n-provider";
import { RevealOnScroll } from "./reveal-on-scroll";
import { localizedPath } from "./localized-path";

const normalizeAssetUrl = (url = "") =>
  url.startsWith("http") || url.startsWith("/") || url.startsWith("#") ? url : `/${url}`;
const formatPrice = (price) => `¥${price.toLocaleString("ja-JP")}`;

const cardsBySection = (homepage, section) => homepage.cards.filter((card) => card.section === section);
const storyImageByCardId = {
  "story-01": "hero-03",
  "story-02": "hero-01",
  "story-03": "hero-02",
};

export function HomeContent({ homepage, menu }) {
  const { language, t } = useI18n();
  const localizedHomepage = localizeValue(homepage, t);
  const localizedMenu = localizeValue(menu, t);
  const { settings } = localizedHomepage;
  const recommended = localizedMenu.drinks.filter((drink) => drink.isRecommended);
  const picks = (recommended.length ? recommended : localizedMenu.drinks).slice(0, 4);
  const slidesById = new Map(localizedHomepage.slides.map((slide) => [slide.id, slide]));

  return (
    <>
      <RevealOnScroll />
      <section className="hero" aria-labelledby="hero-title" data-react-homepage>
        <div className="hero-copy" data-reveal>
          <div className="hero-brand-signature" aria-hidden="true">
            <img src="/assets/nanacha-logo.png" alt="" />
            <span>Fukuoka tea stand</span>
          </div>
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
            <a
              className="primary-button"
              href={
                settings.primaryButtonUrl.startsWith("/")
                  ? localizedPath(language, settings.primaryButtonUrl)
                  : normalizeAssetUrl(settings.primaryButtonUrl)
              }
            >
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
          <a className="text-link" href={localizedPath(language, "/menu")}>
            {t("全メニューを見る")}
          </a>
        </div>
        <div className="menu-grid reveal-group">
          {picks.map((drink, index) => (
            <article className={`drink-card${drink.isFeatured || index === 0 ? " featured" : ""}`} key={drink.id}>
              {drink.isFeatured || index === 0 ? (
                <img className="drink-card-brand" src="/assets/nanacha-logo.png" alt="" aria-hidden="true" />
              ) : null}
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
        <div className="step-grid reveal-group">
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
          <a className="text-link" href={localizedPath(language, "/menu")}>
            {t("メニューで探す")}
          </a>
        </div>
        <div className="guide-grid reveal-group">
          {cardsBySection(localizedHomepage, "recommendGuide").map((card) => (
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
        <div className="story-grid reveal-group">
          {cardsBySection(localizedHomepage, "story").map((card) => {
            const slide = slidesById.get(storyImageByCardId[card.id]);

            return (
            <article key={card.id}>
              {slide ? (
                <img
                  className="story-photo"
                  src={normalizeAssetUrl(slide.imageUrl)}
                  alt={slide.altText}
                />
              ) : null}
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
            );
          })}
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
        <div className="store-list reveal-group">
          {localizedHomepage.stores.map((store) => (
            <article className={`store-card${store.id === "next-store" ? " is-upcoming" : ""}`} key={store.id}>
              <div className="store-card-media">
                {store.storefrontImageUrl ? (
                  <img
                    className="store-photo"
                    src={normalizeAssetUrl(store.storefrontImageUrl)}
                    alt={store.storefrontImageAlt || store.name}
                  />
                ) : (
                  <div className="store-photo-placeholder" aria-hidden="true" />
                )}
              </div>
              <div className="store-card-copy">
                <p className="store-status">{store.statusLabel}</p>
                <h3>{store.name}</h3>
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
        <div className="faq-grid reveal-group">
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
