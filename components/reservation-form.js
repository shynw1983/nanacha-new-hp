"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "./i18n-provider";

const formatPrice = (price) => `¥${price.toLocaleString("ja-JP")}`;
const formatDelta = (price) => (price === 0 ? "¥0" : `${price > 0 ? "+" : "-"}${formatPrice(Math.abs(price))}`);
const findById = (items, id) => items.find((item) => item.id === id);
const formatTimeInput = (date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
const getMinimumPickupTime = () => {
  const now = new Date();
  const date = new Date(now);
  date.setMinutes(date.getMinutes() + 5);
  return date.getDate() !== now.getDate() ? "23:59" : formatTimeInput(date);
};

export function ReservationForm({ initialMenu }) {
  const { t } = useI18n();
  const [menu, setMenu] = useState(initialMenu);
  const [store, setStore] = useState(initialMenu.selectedStoreId || initialMenu.stores?.[0]?.id || "kiyokawa");
  const [category, setCategory] = useState(
    initialMenu.categories.some((item) => item.id === "milk") ? "milk" : initialMenu.categories[0]?.id || "",
  );
  const [drinkName, setDrinkName] = useState("");
  const [sizeId, setSizeId] = useState("regular");
  const [temperature, setTemperature] = useState("ICE");
  const [sweetness, setSweetness] = useState(initialMenu.sweetness[0] || "");
  const [ice, setIce] = useState(initialMenu.ice[0] || "");
  const [optionId, setOptionId] = useState("none");
  const [toppingIds, setToppingIds] = useState([]);
  const [pickup, setPickup] = useState(getMinimumPickupTime());
  const [note, setNote] = useState("注文内容を確認して、Squareの決済画面へ進みます。");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const minimum = getMinimumPickupTime();
      setPickup((current) => (!current || current < minimum ? minimum : current));
    }, 30000);

    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "complete") {
      const pickupCode = params.get("pickupCode");
      setNote(
        pickupCode
          ? `お支払いありがとうございます。受け取り番号は ${pickupCode} です。店頭でこの番号とSquareの決済画面をご提示ください。`
          : "お支払いありがとうございます。店頭でお名前とSquareの決済画面をご提示ください。",
      );
    }

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setNote((current) =>
      current === "注文内容を確認して、Squareの決済画面へ進みます。"
        ? t("注文内容を確認して、Squareの決済画面へ進みます。")
        : current,
    );
  }, [t]);

  useEffect(() => {
    let active = true;
    fetch(`/api/menu?store=${encodeURIComponent(store)}`, { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data?.drinks?.length) {
          setMenu(data);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [store]);

  const drinks = useMemo(
    () =>
      menu.drinks.filter(
        (drink) => drink.category === category && drink.isAvailable !== false && drink.websiteEnabled !== false,
      ),
    [category, menu.drinks],
  );
  const selectedDrink = drinks.find((drink) => drink.name === drinkName) || drinks[0];
  const temperatures = selectedDrink?.temperatures?.length ? selectedDrink.temperatures : ["ICE"];
  const selectedTemperature = temperatures.includes(temperature) ? temperature : temperatures[0];
  const iceOptions = selectedTemperature === "HOT" ? [menu.hotIce] : menu.ice;
  const selectedIce = iceOptions.includes(ice) ? ice : iceOptions[0];
  const availableOptions = menu.options.filter((option) => option.id !== "decaf" || selectedDrink?.supportsDecaf);
  const selectedOption = availableOptions.find((option) => option.id === optionId) || availableOptions[0];
  const availableToppings = menu.toppings.filter(
    (topping) =>
      !(topping.id === "no-tapioca" && menu.tapiocaFreeCategories.includes(category)) &&
      !(topping.id === "no-whip" && !menu.whippedCategories.includes(category)),
  );
  const selectedToppings = toppingIds
    .map((id) => availableToppings.find((topping) => topping.id === id))
    .filter(Boolean);
  const selectedSize = findById(menu.sizes, sizeId) || menu.sizes[0];
  const total =
    (selectedDrink?.price || 0) +
    (selectedSize?.price || 0) +
    (selectedOption?.price || 0) +
    selectedToppings.reduce((sum, item) => sum + item.price, 0);

  useEffect(() => {
    if (selectedDrink && selectedDrink.name !== drinkName) {
      setDrinkName(selectedDrink.name);
    }
  }, [drinkName, selectedDrink]);

  const submitOrder = async (event) => {
    event.preventDefault();
    const minimum = getMinimumPickupTime();
    const safePickup = pickup < minimum ? minimum : pickup;
    setPickup(safePickup);

    const order = {
      store,
      drink: selectedDrink?.name || "",
      category,
      size: selectedSize?.id || "",
      temperature: selectedTemperature,
      sweetness,
      ice: selectedIce,
      option: selectedOption?.id || "",
      toppings: selectedToppings.map((item) => item.id),
      pickup: safePickup,
      total,
      labels: {
        drink: selectedDrink?.name || "",
        size: selectedSize?.label || "",
        temperature: selectedTemperature,
        option: selectedOption?.label || "",
        toppings: selectedToppings.map((item) => item.label),
      },
    };

    setNote(
      `${order.pickup} 受け取り：${order.drink}、${order.labels.size}、${order.temperature}、${order.sweetness}、${order.ice}、合計${formatPrice(order.total)}でSquare決済を作成しています。`,
    );
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const result = await response.json();

      if (!response.ok || !result.checkoutUrl) {
        const error = new Error(result.error || "Checkout failed");
        error.code = result.code;
        throw error;
      }

      window.location.href = result.checkoutUrl;
    } catch (error) {
      setNote(
        error.code === "SQUARE_NOT_CONFIGURED"
          ? "Square設定が未完了です。店舗側でVercelの環境変数を設定してください。"
          : "決済画面を作成できませんでした。時間をおいて再度お試しください。",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <section className="reserve-section" id="reserve" aria-labelledby="reserve-title" data-react-reservation-form>
      <div className="reserve-panel">
        <p className="eyebrow eyebrow-with-decor">
          <img src="/assets/decor/speed-lines.png" alt="" aria-hidden="true" />
          pickup desk
        </p>
        <h2 id="reserve-title" className="heading-with-decor">
          {t("受け取り予約")}
          <img src="/assets/decor/dog-heart.png" alt="" aria-hidden="true" />
        </h2>
        <form className="reserve-form" onSubmit={submitOrder}>
          <label>
            <span>{t("店舗")}</span>
            <select value={store} onChange={(event) => setStore(event.target.value)}>
              {(menu.stores?.length ? menu.stores : [{ id: "kiyokawa", label: "福岡清川店" }]).map((item) => (
                <option value={item.id} key={item.id}>
                  {t(item.label)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("カテゴリー")}</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {menu.categories.map((item) => (
                <option value={item.id} key={item.id}>
                  {t(item.label)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("ドリンク")}</span>
            <select value={selectedDrink?.name || ""} onChange={(event) => setDrinkName(event.target.value)}>
              {drinks.map((drink) => (
                <option value={drink.name} key={drink.id}>
                  {t(drink.name)} {formatPrice(drink.price)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("サイズ")}</span>
            <select value={selectedSize?.id || ""} onChange={(event) => setSizeId(event.target.value)}>
              {menu.sizes.map((size) => (
                <option value={size.id} key={size.id}>
                  {t(size.label)} ({formatDelta(size.price)})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("温度")}</span>
            <select value={selectedTemperature} onChange={(event) => setTemperature(event.target.value)}>
              {temperatures.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("甘さ")}</span>
            <select value={sweetness} onChange={(event) => setSweetness(event.target.value)}>
              {menu.sweetness.map((item) => (
                <option value={item} key={item}>
                  {t(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("氷の量")}</span>
            <select value={selectedIce} onChange={(event) => setIce(event.target.value)}>
              {iceOptions.map((item) => (
                <option value={item} key={item}>
                  {t(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("オプション")}</span>
            <select value={selectedOption?.id || ""} onChange={(event) => setOptionId(event.target.value)}>
              {availableOptions.map((option) => (
                <option value={option.id} key={option.id}>
                  {t(option.label)} ({formatDelta(option.price)})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("受け取り時間")}</span>
            <input
              type="time"
              value={pickup}
              min={getMinimumPickupTime()}
              onChange={(event) => setPickup(event.target.value)}
            />
          </label>
          <fieldset className="topping-field">
            <legend>{t("トッピング")}</legend>
            <div className="topping-grid">
              {availableToppings.map((topping) => (
                <label key={topping.id}>
                  <input
                    type="checkbox"
                    checked={toppingIds.includes(topping.id)}
                    onChange={(event) =>
                      setToppingIds((current) =>
                        event.target.checked
                          ? [...current, topping.id]
                          : current.filter((item) => item !== topping.id),
                      )
                    }
                  />
                  <span>
                    {t(topping.label)} ({formatDelta(topping.price)})
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="order-total">{t("合計")} {formatPrice(total)}</p>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("決済画面を作成中...") : t("Squareで注文・支払い")}
          </button>
          <p className="form-note">{note}</p>
        </form>
      </div>
    </section>
  );
}
