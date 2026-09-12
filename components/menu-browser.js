"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "./i18n-provider";
import { localizeMenu } from "../data/menu-display";

const categoryDecor = {
  frappe: "sparkle.png",
  milk: "tapioca-three.png",
  smoothie: "wave.png",
  "cheese-tea": "heart-fill.png",
  tea: "tapioca-one.png",
  special: "heart.png",
  coffee: "tapioca-two.png",
  "tea-coffee": "sunglasses.png",
};

const formatPrice = (price) => `¥${price.toLocaleString("ja-JP")}`;
const normalizeAssetUrl = (url = "") =>
  url.startsWith("http") || url.startsWith("/") ? url : `/${url}`;
const highResolutionMenuAssetUrl = (url = "") =>
  url.startsWith("assets/menu/") ? url.replace("assets/menu/", "assets/menu-large/") : url;

export function MenuBrowser({ initialMenu }) {
  const { language, t } = useI18n();
  const [menu, setMenu] = useState(initialMenu || null);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    let active = true;

    if (initialMenu) {
      return;
    }

    fetch("/api/menu", { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data?.categories?.length && data?.drinks?.length) {
          setMenu(data);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [initialMenu]);

  const localizedMenu = useMemo(() => (menu ? localizeMenu(menu, language) : null), [menu, language]);
  const visibleCategories = useMemo(() => {
    if (!localizedMenu) return [];

    return localizedMenu.categories
      .map((category) => ({
        ...category,
        drinks: localizedMenu.drinks.filter((drink) => drink.category === category.id),
      }))
      .filter((category) => category.drinks.length)
      .filter((category) => activeFilter === "all" || category.id === activeFilter);
  }, [activeFilter, localizedMenu]);

  if (!localizedMenu) {
    return <div data-react-menu-browser />;
  }

  return (
    <div data-react-menu-browser>
      <section className="menu-controls" aria-label={t("メニューカテゴリー")}>
        <button
          type="button"
          className={activeFilter === "all" ? "is-active" : ""}
          onClick={() => setActiveFilter("all")}
        >
          {t("すべて")}
        </button>
        {localizedMenu.categories.filter((category) => localizedMenu.drinks.some((item) => item.category === category.id)).map((category) => (
          <button
            key={category.id}
            type="button"
            className={activeFilter === category.id ? "is-active" : ""}
            onClick={() => setActiveFilter(category.id)}
          >
            {category.label}
          </button>
        ))}
      </section>

      <section className="full-menu" aria-label={t("nanacha メニュー一覧")}>
        {visibleCategories.map((category) => (
          <article className="menu-category" key={category.id}>
            <div className="category-heading">
              <h2 className="heading-with-decor">
                {category.label}
                <img
                  src={`/assets/decor/${categoryDecor[category.id] || "tapioca-one.png"}`}
                  alt=""
                  aria-hidden="true"
                />
              </h2>
              {category.note ? <p className="category-note">{category.note}</p> : null}
            </div>
            <div className={`product-list ${category.drinks.length > 2 ? "compact" : ""}`}>
              {category.drinks.map((drink) => (
                <article className={`product-item ${drink.imageUrl ? "with-photo" : "simple"}`} key={drink.id}>
                  {drink.imageUrl ? (
                    <img className="product-photo" src={normalizeAssetUrl(highResolutionMenuAssetUrl(drink.imageUrl))} alt={drink.name} />
                  ) : null}
                  <div>
                    <h3>{drink.name}</h3>
                    {drink.description ? <p className="menu-description-preview">{drink.description}</p> : null}
                    {drink.description.length > 140 ? (
                      <details className="menu-description-details">
                        <summary>{t("商品説明を読む")}</summary>
                        <p>{drink.description}</p>
                      </details>
                    ) : null}
                  </div>
                  <div className="product-item-actions">
                    {drink.priceConfigured === false ? <span>{t("準備中")}</span> : <><small>{t("基本価格")}</small><span>{formatPrice(drink.price)}</span></>}
                  </div>
                </article>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
