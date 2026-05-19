"use client";

import { useEffect, useMemo, useState } from "react";
import { localizeValue, useI18n } from "./i18n-provider";

const RESERVATION_CART_KEY = "nanacha-reservation-cart";

const categoryDecor = {
  frappe: "sparkle.png",
  milk: "tapioca-three.png",
  smoothie: "wave.png",
  "cheese-tea": "heart-fill.png",
  tea: "tail.png",
  special: "dog-heart.png",
  coffee: "tapioca-two.png",
  "tea-coffee": "sunglasses.png",
};

const formatPrice = (price) => `¥${price.toLocaleString("ja-JP")}`;
const normalizeAssetUrl = (url = "") =>
  url.startsWith("http") || url.startsWith("/") ? url : `/${url}`;

export function MenuBrowser({ initialMenu }) {
  const { language, t } = useI18n();
  const [menu, setMenu] = useState(initialMenu || null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [reservationItems, setReservationItems] = useState([]);

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

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(RESERVATION_CART_KEY) || "[]");
      if (Array.isArray(stored)) {
        setReservationItems(stored);
      }
    } catch {
      setReservationItems([]);
    }
  }, []);

  const localizedMenu = useMemo(() => (menu ? localizeValue(menu, t) : null), [menu, t]);
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

  const persistReservationItems = (items) => {
    setReservationItems(items);
    try {
      window.localStorage.setItem(RESERVATION_CART_KEY, JSON.stringify(items));
    } catch {
      // Continue without persistence.
    }
  };
  const addReservationItem = (drink) => {
    persistReservationItems([
      ...reservationItems,
      {
        drinkId: drink.id,
        drinkName: drink.name,
        category: drink.category,
      },
    ]);
  };
  const reserveHref = language === "ja" ? "/#reserve" : `/${language}#reserve`;

  return (
    <div data-react-menu-browser>
      <section className="menu-controls" aria-label="メニューカテゴリー">
        <button
          type="button"
          className={activeFilter === "all" ? "is-active" : ""}
          onClick={() => setActiveFilter("all")}
        >
          all
        </button>
        {localizedMenu.categories.map((category) => (
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

      <section className="full-menu" aria-label="nanacha メニュー一覧">
        {visibleCategories.map((category) => (
          <article className="menu-category" key={category.id}>
            <div className="category-heading">
              <p className="eyebrow">{category.id}</p>
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
                    <img className="product-photo" src={normalizeAssetUrl(drink.imageUrl)} alt={drink.name} />
                  ) : null}
                  <div>
                    <h3>{drink.name}</h3>
                    {drink.description ? <p>{drink.description}</p> : null}
                  </div>
                  <div className="product-item-actions">
                    <span>{formatPrice(drink.price)}</span>
                    <button type="button" onClick={() => addReservationItem(drink)} aria-label={`${drink.name}を予約に追加`}>
                      <span aria-hidden="true">+</span>
                      <em>{t("予約")}</em>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </article>
        ))}
      </section>
      {reservationItems.length ? (
        <aside className="reservation-dock" aria-live="polite">
          <p>
            <strong>{reservationItems.length}</strong>
            {t("点を予約リストに追加済み")}
          </p>
          <div>
            <button type="button" onClick={() => persistReservationItems([])}>
              {t("クリア")}
            </button>
            <a className="primary-button" href={reserveHref}>
              {t("予約へ進む")}
            </a>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
