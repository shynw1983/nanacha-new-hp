"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "./i18n-provider";
import { buildMemberHandoffUrl, consumeMemberHandoff, memberPreferredLanguage } from "./member-session";

const formatPrice = (price) => `¥${price.toLocaleString("ja-JP")}`;
const formatDelta = (price) => (price === 0 ? "¥0" : `${price > 0 ? "+" : "-"}${formatPrice(Math.abs(price))}`);
const findById = (items, id) => items.find((item) => item.id === id);
const getCouponDiscountAmount = (coupon, subtotal) => {
  const baseAmount = Math.max(0, Math.round(Number(subtotal) || 0));
  const value = Math.max(0, Math.round(Number(coupon?.discountValue) || 0));
  const maxAmount = coupon?.maxDiscountAmount == null ? null : Math.max(0, Math.round(Number(coupon.maxDiscountAmount) || 0));
  const rawDiscount = coupon?.discountType === "percent" ? Math.floor(baseAmount * value / 100) : value;
  return Math.min(baseAmount, maxAmount == null ? rawDiscount : Math.min(rawDiscount, maxAmount));
};
const formatCouponValue = (coupon) => {
  if (coupon?.discountType === "percent") {
    return coupon.maxDiscountAmount ? `${coupon.discountValue}% OFF / 最大${formatPrice(coupon.maxDiscountAmount)}` : `${coupon.discountValue}% OFF`;
  }
  return `${formatPrice(coupon?.discountValue || 0)} OFF`;
};
const formatSweetnessLabel = (value) => (value ? `甘さ: ${value}` : "");
const formatIceLabel = (value) => (value ? `氷: ${value}` : "");
const normalizeAssetUrl = (url = "") =>
  url.startsWith("http") || url.startsWith("/") ? url : `/${url}`;
const allowedSet = (drink, field) => {
  const values = Array.isArray(drink?.[field]) ? drink[field].filter(Boolean) : [];
  if (drink?.strictOptionScopes && Array.isArray(drink?.[field])) return new Set(values.map(String));
  return values.length ? new Set(values.map(String)) : null;
};
const filterAllowedIds = (items, drink, field) => {
  const allowed = allowedSet(drink, field);
  if (!allowed) return items;
  const filtered = items.filter((item) => allowed.has(item.id));
  if (drink?.strictOptionScopes) return filtered;
  return filtered.length ? filtered : items;
};
const filterAllowedValues = (items, drink, field) => {
  const allowed = allowedSet(drink, field);
  if (!allowed) return items;
  const filtered = items.filter((item) => allowed.has(item));
  if (drink?.strictOptionScopes) return filtered;
  return filtered.length ? filtered : items;
};
const filterAllowedOptions = (items, drink) => {
  const allowed = allowedSet(drink, "allowedOptions");
  return items.filter((item) => item.id === "none" || !allowed || allowed.has(item.id));
};
const customizationGroupsForDrink = (drink) =>
  drink?.usesStructuredCustomizations && Array.isArray(drink.customizationGroups)
    ? drink.customizationGroups.filter((group) => Array.isArray(group.options) && group.options.length)
    : [];
const selectionCount = (selections, groupId) =>
  Array.isArray(selections?.[groupId]) ? selections[groupId].length : 0;
const selectedCustomizationOptions = (group, selections) => {
  const selectedIds = Array.isArray(selections?.[group.id]) ? selections[group.id] : [];
  return selectedIds.map((id) => group.options.find((option) => option.id === id)).filter(Boolean);
};
const normalizeCustomizationSelections = (groups, selections = {}) =>
  Object.fromEntries(
    groups.map((group) => {
      const availableIds = new Set(group.options.map((option) => option.id));
      const maximum = group.maxSelections > 0 ? group.maxSelections : group.selectionType === "single" ? 1 : Infinity;
      const selectedIds = (Array.isArray(selections[group.id]) ? selections[group.id] : [])
        .map(String)
        .filter((id) => availableIds.has(id))
        .filter((id, index, values) => group.allowRepeat || values.indexOf(id) === index)
        .slice(0, maximum);
      return [group.id, selectedIds];
    }),
  );
const hasRequiredCustomizations = (groups, selections) =>
  groups.every((group) => selectionCount(selections, group.id) >= (group.minSelections || 0));
const buildCustomizations = (groups, selections) =>
  groups
    .map((group) => {
      const options = selectedCustomizationOptions(group, selections);
      if (!options.length) return null;
      return {
        groupId: group.id,
        groupKey: group.groupKey || group.externalId || group.id,
        groupName: group.label,
        groupDisplayNames: group.displayNames || {},
        selectionType: group.selectionType,
        optionIds: options.map((option) => option.id),
        optionKeys: options.map((option) => option.optionKey || option.externalId || option.id),
        optionLabels: options.map((option) => option.label),
        optionDisplayNames: options.map((option) => option.displayNames || {}),
        price: options.reduce((sum, option) => sum + (option.price || 0), 0),
      };
    })
    .filter(Boolean);
const structuredCustomizationFields = (customizations = []) => {
  const findGroup = (name) => customizations.find((group) => group.groupName === name);
  const size = findGroup("サイズ");
  const temperature = findGroup("温度");
  const sweetness = findGroup("甘さ");
  const otherGroups = customizations.filter((group) => !["サイズ", "温度", "甘さ"].includes(group.groupName));
  return {
    size: size?.optionKeys?.[0] || size?.optionIds?.[0] || "",
    sizeLabel: size?.optionLabels?.[0] || "",
    temperature: temperature?.optionLabels?.[0] || "",
    sweetness: sweetness?.optionLabels?.[0] || "",
    ice: "",
    option: otherGroups.flatMap((group) => group.optionKeys || []).join(","),
    optionLabel: otherGroups.map((group) => `${group.groupName}：${group.optionLabels.join("、")}`).join(", "),
    toppings: [],
    toppingLabels: [],
  };
};
const customizationPrice = (customizations = []) =>
  customizations.reduce((sum, group) => sum + (group.price || 0), 0);
const RESERVATION_CART_KEY = "nanacha-reservation-cart";
const DEFAULT_NOTE = "注文内容を確認して、Squareの決済画面へ進みます。";
const DEFAULT_RESERVATION_DRINK_NAME = "黒糖タピオカミルク";
const DEFAULT_MINIMUM_PICKUP_MINUTES = 5;
const unsafeCheckoutErrorPattern = /(FOUNDR1|Foundr1|Square|configured|configuration|Invalid|Missing|Unknown|checkout|failed|required|Selected coupon)/i;
const unavailableCheckoutErrorMessages = new Set([
  "Unknown drink",
  "Invalid customization",
  "Invalid temperature",
  "Invalid ice amount",
  "Invalid topping",
  "Invalid topping for tapioca-free category",
  "Invalid topping for non-whip category",
]);
const unavailableCheckoutMessage = "選択した商品の一部が現在販売停止または品切れです。予約リストを更新して、もう一度選び直してください。";
const normalizeMinimumPickupMinutes = (value) => {
  if (value === null || value === undefined || value === "") return DEFAULT_MINIMUM_PICKUP_MINUTES;
  const minutes = Math.round(Number(value));
  if (!Number.isFinite(minutes)) return DEFAULT_MINIMUM_PICKUP_MINUTES;
  return Math.max(0, Math.min(240, minutes));
};
const getTokyoDateTimeParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};
const getMinimumPickupDateTime = (leadMinutes = DEFAULT_MINIMUM_PICKUP_MINUTES) => {
  const parts = getTokyoDateTimeParts(new Date(Date.now() + leadMinutes * 60 * 1000));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
};
const addDays = (dateString, amount) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
};
const toMinutes = (time = "") => {
  const [hour, minute] = String(time).split(":").map(Number);
  return hour * 60 + minute;
};
const parseOpeningWindow = (hours = "") => {
  const match = String(hours).match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (!match) return null;
  return {
    opens: match[1],
    closes: match[2],
    crossesMidnight: toMinutes(match[2]) <= toMinutes(match[1]),
  };
};
const compareDateTime = (leftDate, leftTime, rightDate, rightTime) =>
  `${leftDate}T${leftTime}`.localeCompare(`${rightDate}T${rightTime}`);
const getNextAvailablePickupDateTime = (hours = "", leadMinutes = DEFAULT_MINIMUM_PICKUP_MINUTES) => {
  const minimum = getMinimumPickupDateTime(leadMinutes);
  const window = parseOpeningWindow(hours);
  if (!window) return minimum;

  for (let offset = -1; offset <= 2; offset += 1) {
    const openDate = addDays(minimum.date, offset);
    const closeDate = window.crossesMidnight ? addDays(openDate, 1) : openDate;
    const startsAfterMinimum = compareDateTime(minimum.date, minimum.time, openDate, window.opens) <= 0;
    const insideWindow =
      compareDateTime(minimum.date, minimum.time, openDate, window.opens) >= 0 &&
      compareDateTime(minimum.date, minimum.time, closeDate, window.closes) <= 0;

    if (startsAfterMinimum) {
      return { date: openDate, time: window.opens };
    }

    if (insideWindow) {
      return minimum;
    }
  }

  return minimum;
};

function StructuredCustomizationFields({ groups, selections, onChange, menuText, t, compact = false }) {
  return (
    <div className={`structured-customization-groups${compact ? " is-compact" : ""}`}>
      {groups.map((group) => {
        const selectedIds = Array.isArray(selections?.[group.id]) ? selections[group.id] : [];
        const maximum = group.maxSelections > 0 ? group.maxSelections : group.selectionType === "single" ? 1 : group.options.length;
        const required = (group.minSelections || 0) > 0;
        return (
          <fieldset className="structured-customization-group" key={group.id}>
            <legend>
              <span>{menuText(group, group.label)}</span>
              <small>{required ? t("必須") : t("任意")}</small>
            </legend>
            {group.selectionType === "single" ? (
              <select
                value={selectedIds[0] || ""}
                required={required}
                onChange={(event) => onChange(group.id, event.target.value ? [event.target.value] : [])}
              >
                <option value="">{required ? t("選択してください") : t("選択しない")}</option>
                {group.options.map((option) => (
                  <option value={option.id} key={option.id}>
                    {menuText(option, option.label)}
                    {option.price ? ` (${formatDelta(option.price)})` : ""}
                  </option>
                ))}
              </select>
            ) : group.allowRepeat ? (
              <div className="structured-customization-options">
                {group.options.map((option) => {
                  const quantity = selectedIds.filter((id) => id === option.id).length;
                  const otherCount = selectedIds.length - quantity;
                  const perOptionMaximum = group.perOptionMax > 0 ? group.perOptionMax : maximum;
                  const allowedQuantity = Math.max(0, Math.min(perOptionMaximum, maximum - otherCount));
                  return (
                    <label className="structured-customization-quantity" key={option.id}>
                      <span>
                        {menuText(option, option.label)}
                        {option.price ? ` (${formatDelta(option.price)})` : ""}
                      </span>
                      <select
                        value={quantity}
                        onChange={(event) => {
                          const nextQuantity = Number(event.target.value) || 0;
                          const withoutOption = selectedIds.filter((id) => id !== option.id);
                          onChange(group.id, [...withoutOption, ...Array(nextQuantity).fill(option.id)]);
                        }}
                      >
                        {Array.from({ length: allowedQuantity + 1 }, (_, index) => (
                          <option value={index} key={index}>{index}</option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="structured-customization-options">
                {group.options.map((option) => {
                  const checked = selectedIds.includes(option.id);
                  const disabled = !checked && selectedIds.length >= maximum;
                  return (
                    <label key={option.id}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={(event) =>
                          onChange(
                            group.id,
                            event.target.checked
                              ? [...selectedIds, option.id]
                              : selectedIds.filter((id) => id !== option.id),
                          )
                        }
                      />
                      <span>
                        {menuText(option, option.label)}
                        {option.price ? ` (${formatDelta(option.price)})` : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}

export function ReservationForm({ initialMenu, stores = [], fixedStoreId = "", catalogMode = false }) {
  const { language, setLanguage, t } = useI18n();
  const menuText = (item, fallback = "") => {
    const source = item && typeof item === "object" ? item : {};
    const original = fallback || source.label || source.name || "";
    if (language === "ja") {
      return source.displayNames?.ja || original || source.displayNames?.en || "";
    }
    return source.displayNames?.[language] || t(original) || source.displayNames?.en || "";
  };
  const menuDescription = (item) => {
    const source = item && typeof item === "object" ? item : {};
    const original = source.description || "";
    if (language === "ja") {
      return source.descriptionDisplayNames?.ja || original || source.descriptionDisplayNames?.en || "";
    }
    return source.descriptionDisplayNames?.[language] || t(original) || source.descriptionDisplayNames?.en || "";
  };
  const promotionPrefixText = (item) => {
    const original = String(item?.promotionPrefix || "").trim();
    if (!original) return "";
    const displayNames = item?.promotionPrefixDisplayNames || {};
    if (language === "ja") return displayNames.ja || original;
    return displayNames[language] || displayNames.en || original;
  };
  const rawText = (value) => t(value);
  const initialStoreId = fixedStoreId || initialMenu.selectedStoreId || initialMenu.stores?.[0]?.id || "kiyokawa";
  const initialStore = stores.find((item) => item.id === initialStoreId);
  const initialMinimumPickupMinutes = normalizeMinimumPickupMinutes(initialMenu.storeOperation?.minimumPickupMinutes);
  const initialPickup = getNextAvailablePickupDateTime(initialStore?.hours, initialMinimumPickupMinutes);
  const [menu, setMenu] = useState(initialMenu);
  const [store, setStore] = useState(initialStoreId);
  const [category, setCategory] = useState(
    initialMenu.categories.some((item) => item.id === "milk") ? "milk" : initialMenu.categories[0]?.id || "",
  );
  const [drinkName, setDrinkName] = useState("");
  const [detailDrinkId, setDetailDrinkId] = useState("");
  const [sizeId, setSizeId] = useState("regular");
  const [temperature, setTemperature] = useState("ICE");
  const [sweetness, setSweetness] = useState(initialMenu.sweetness[0] || "");
  const [ice, setIce] = useState(initialMenu.ice[0] || "");
  const [optionId, setOptionId] = useState("none");
  const [toppingIds, setToppingIds] = useState([]);
  const [customizationSelections, setCustomizationSelections] = useState({});
  const [minimumPickup, setMinimumPickup] = useState(initialPickup);
  const [pickupDate, setPickupDate] = useState(initialPickup.date);
  const [pickup, setPickup] = useState(initialPickup.time);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [memberProfile, setMemberProfile] = useState(null);
  const [selectedCouponId, setSelectedCouponId] = useState("");
  const [shortagePreference, setShortagePreference] = useState("");
  const [memberHref, setMemberHref] = useState("https://foundr1.jp/member");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservationItems, setReservationItems] = useState([]);
  const [hasLoadedReservationItems, setHasLoadedReservationItems] = useState(false);
  const minimumPickupMinutes = normalizeMinimumPickupMinutes(menu.storeOperation?.minimumPickupMinutes);
  const reservationsPaused = menu.storeOperation?.reservationsEnabled === false;
  const reservationPauseMessage = menu.storeOperation?.statusNote
    ? `現在予約受付を停止しています（${menu.storeOperation.statusNote}）。店頭での受付状況は店舗へご確認ください。`
    : "現在予約受付を停止しています。店頭での受付状況は店舗へご確認ください。";

  useEffect(() => {
    setMemberHref(buildMemberHandoffUrl());
    consumeMemberHandoff()
      .then((profile) => {
        if (!profile) return;
        const nextLanguage = memberPreferredLanguage(profile);
        if (nextLanguage && nextLanguage !== language) setLanguage(nextLanguage);
        setMemberProfile(profile);
        setCustomerName((current) => current || profile.displayName || "");
        setCustomerPhone((current) => current || profile.phone || "");
      })
      .catch(() => {});
  }, [language, setLanguage]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextMinimum = getNextAvailablePickupDateTime(stores.find((item) => item.id === store)?.hours, minimumPickupMinutes);
      setMinimumPickup(nextMinimum);
      setPickupDate((current) => (!current || current < nextMinimum.date ? nextMinimum.date : current));
      setPickup((current) =>
        pickupDate === nextMinimum.date && (!current || current < nextMinimum.time) ? nextMinimum.time : current,
      );
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
  }, [minimumPickupMinutes, pickupDate, store, stores]);

  useEffect(() => {
    let active = true;
    let pusher;
    let channel;
    let fallbackTimer = 0;
    let fallbackStartedAt = Date.now();
    let realtimeConnected = false;
    const loadMenu = (resetSelection = false) => {
      fetch(`/api/menu?store=${encodeURIComponent(store)}`, { headers: { Accept: "application/json" }, cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (!active || !data?.categories || !Array.isArray(data.drinks)) return;

          const visibleDrinks = data.drinks.filter((drink) => drink.websiteEnabled !== false);
          const availableDrinks = visibleDrinks.filter((drink) => drink.isAvailable !== false);
          const categoriesWithDrinks = new Set(visibleDrinks.map((drink) => drink.category));
          const availableDrinkNames = new Set(availableDrinks.map((drink) => drink.name));

          setMenu(data);
          setCategory((current) =>
            categoriesWithDrinks.has(current)
              ? current
              : data.categories.find((item) => categoriesWithDrinks.has(item.id))?.id || data.categories[0]?.id || "",
          );
          setDrinkName((current) => (resetSelection || !availableDrinkNames.has(current) ? "" : current));
          if (resetSelection) setToppingIds([]);
        })
        .catch(() => {});
    };

    const clearFallback = () => {
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      fallbackTimer = 0;
    };
    const scheduleFallback = () => {
      clearFallback();
      if (!active || realtimeConnected || document.visibilityState !== "visible") return;
      const disconnectedFor = Date.now() - fallbackStartedAt;
      const delay = disconnectedFor >= 15 * 60_000 ? 5 * 60_000 : disconnectedFor >= 5 * 60_000 ? 2 * 60_000 : 60_000;
      fallbackTimer = window.setTimeout(() => {
        loadMenu(false);
        scheduleFallback();
      }, delay);
    };
    const startFallback = (immediate = false) => {
      if (!fallbackStartedAt) fallbackStartedAt = Date.now();
      realtimeConnected = false;
      if (immediate && document.visibilityState === "visible") loadMenu(false);
      scheduleFallback();
    };
    const stopFallback = () => {
      realtimeConnected = true;
      fallbackStartedAt = 0;
      clearFallback();
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible") {
        clearFallback();
        return;
      }
      loadMenu(false);
      if (!realtimeConnected) scheduleFallback();
    };

    loadMenu(true);
    scheduleFallback();
    const osStoreId = String(
      stores.find((item) => item.id === store)?.osStoreId ||
      initialMenu.stores?.find((item) => item.id === store)?.osStoreId ||
      initialMenu.stores?.[0]?.osStoreId ||
      "",
    ).trim();
    fetch(`/api/menu/realtime-config?storeId=${encodeURIComponent(osStoreId)}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then(async (config) => {
        if (!active || !config?.key || !config?.cluster || !config?.menuChannel) return;
        const { default: Pusher } = await import("pusher-js");
        if (!active) return;
        pusher = new Pusher(config.key, { cluster: config.cluster, forceTLS: true });
        pusher.connection.bind("unavailable", () => startFallback(true));
        pusher.connection.bind("failed", () => startFallback(true));
        pusher.connection.bind("disconnected", () => startFallback(true));
        channel = pusher.subscribe(config.menuChannel);
        channel.bind("pusher:subscription_succeeded", () => {
          stopFallback();
          loadMenu(false);
        });
        channel.bind("pusher:subscription_error", () => startFallback(true));
        channel.bind("menu.updated", () => loadMenu(false));
      })
      .catch(() => startFallback());
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      clearFallback();
      channel?.unbind_all?.();
      if (channel) pusher?.unsubscribe(channel.name);
      pusher?.disconnect();
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [initialMenu.stores, store, stores]);

  useEffect(() => {
    const nextPickup = getNextAvailablePickupDateTime(stores.find((item) => item.id === store)?.hours, minimumPickupMinutes);
    setMinimumPickup(nextPickup);
    setPickupDate(nextPickup.date);
    setPickup(nextPickup.time);
  }, [minimumPickupMinutes, store, stores]);

  useEffect(() => {
    if (!detailDrinkId) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setDetailDrinkId("");
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [detailDrinkId]);

  const drinks = useMemo(
    () =>
      menu.drinks.filter(
        (drink) => drink.category === category && drink.isAvailable !== false && drink.websiteEnabled !== false,
      ),
    [category, menu.drinks],
  );
  const selectedDrink =
    drinks.find((drink) => drink.name === drinkName) ||
    drinks.find((drink) => drink.name === DEFAULT_RESERVATION_DRINK_NAME) ||
    drinks[0];
  const detailDrink = menu.drinks.find((drink) => drink.id === detailDrinkId);
  const structuredGroups = customizationGroupsForDrink(selectedDrink);
  const normalizedCustomizationSelections = normalizeCustomizationSelections(structuredGroups, customizationSelections);
  const selectedCustomizations = buildCustomizations(structuredGroups, normalizedCustomizationSelections);
  const structuredCustomizationsComplete = hasRequiredCustomizations(structuredGroups, normalizedCustomizationSelections);
  const temperatures = selectedDrink?.temperatures?.length ? selectedDrink.temperatures : ["ICE"];
  const selectedTemperature = temperatures.includes(temperature) ? temperature : temperatures[0];
  const availableSizes = filterAllowedIds(menu.sizes, selectedDrink, "allowedSizes");
  const selectedSize = findById(availableSizes, sizeId) || findById(availableSizes, "regular") || availableSizes[0];
  const sweetnessOptions = filterAllowedValues(menu.sweetness, selectedDrink, "allowedSweetness");
  const selectedSweetness = sweetnessOptions.includes(sweetness) ? sweetness : sweetnessOptions[0] || "";
  const iceOptions = selectedTemperature === "HOT" ? [menu.hotIce] : filterAllowedValues(menu.ice, selectedDrink, "allowedIce");
  const selectedIce = iceOptions.includes(ice) ? ice : iceOptions[0];
  const availableOptions = filterAllowedOptions(menu.options, selectedDrink);
  const selectedOption = availableOptions.find((option) => option.id === optionId) || availableOptions[0];
  const availableToppings = filterAllowedIds(menu.toppings, selectedDrink, "allowedToppings").filter(
    (topping) =>
      !(topping.id === "no-tapioca" && menu.tapiocaFreeCategories.includes(category)) &&
      !(topping.id === "no-whip" && !menu.whippedCategories.includes(category)),
  );
  const selectedToppings = toppingIds
    .map((id) => availableToppings.find((topping) => topping.id === id))
    .filter(Boolean);
  const total =
    (selectedDrink?.price || 0) +
    (structuredGroups.length
      ? customizationPrice(selectedCustomizations)
      : (selectedSize?.price || 0) +
        (selectedOption?.price || 0) +
        selectedToppings.reduce((sum, item) => sum + item.price, 0));
  const hasAvailableDrinks = menu.drinks.some(
    (drink) => drink.isAvailable !== false && drink.websiteEnabled !== false,
  );
  const catalogCategories = menu.categories
    .map((item) => ({
      ...item,
      drinks: menu.drinks.filter(
        (drink) =>
          drink.category === item.id &&
          drink.websiteEnabled !== false,
      ),
    }))
    .filter((item) => item.drinks.length);
  const getReservationDrink = (item) =>
    menu.drinks.find((drink) => drink.id === item.drinkId) || menu.drinks.find((drink) => drink.name === item.drink);
  const getReservationSizes = (drink) => filterAllowedIds(menu.sizes, drink, "allowedSizes");
  const getReservationSweetness = (drink) => filterAllowedValues(menu.sweetness, drink, "allowedSweetness");
  const getReservationOptions = (drink) => filterAllowedOptions(menu.options, drink);
  const getReservationToppings = (item, drink = getReservationDrink(item)) =>
    filterAllowedIds(menu.toppings, drink, "allowedToppings").filter(
      (topping) =>
        !(topping.id === "no-tapioca" && menu.tapiocaFreeCategories.includes(item.category)) &&
        !(topping.id === "no-whip" && !menu.whippedCategories.includes(item.category)),
    );
  const getReservationIceOptions = (item, drink = getReservationDrink(item)) =>
    item.temperature === "HOT" ? [menu.hotIce] : filterAllowedValues(menu.ice, drink, "allowedIce");
  const normalizeReservationItem = (item) => {
    const drink = getReservationDrink(item);
    const itemStructuredGroups = customizationGroupsForDrink(drink);
    if (itemStructuredGroups.length) {
      const selections = Object.fromEntries(
        (Array.isArray(item.customizations) ? item.customizations : []).map((customization) => [
          customization.groupId,
          customization.optionIds || [],
        ]),
      );
      const normalizedSelections = normalizeCustomizationSelections(itemStructuredGroups, selections);
      const customizations = buildCustomizations(itemStructuredGroups, normalizedSelections);
      const fields = structuredCustomizationFields(customizations);
      return {
        ...item,
        drinkId: drink?.id || item.drinkId || "",
        drink: drink?.name || item.drink || "",
        category: drink?.category || item.category || "",
        ...fields,
        customizations,
        customizationsComplete: hasRequiredCustomizations(itemStructuredGroups, normalizedSelections),
        total: (drink?.price || 0) + customizationPrice(customizations),
      };
    }
    const sizeItems = getReservationSizes(drink);
    const size = findById(sizeItems, item.size) || findById(sizeItems, "regular") || sizeItems[0];
    const temperatures = drink?.temperatures?.length ? drink.temperatures : ["ICE"];
    const itemTemperature = temperatures.includes(item.temperature) ? item.temperature : temperatures[0];
    const iceOptions = itemTemperature === "HOT" ? [menu.hotIce] : filterAllowedValues(menu.ice, drink, "allowedIce");
    const itemIce = iceOptions.includes(item.ice) ? item.ice : iceOptions[0] || "";
    const optionItems = getReservationOptions(drink);
    const option = optionItems.find((optionItem) => optionItem.id === item.option) || optionItems[0];
    const sweetnessItems = getReservationSweetness(drink);
    const toppingItems = getReservationToppings({ ...item, category: drink?.category || item.category }, drink);
    const toppings = (item.toppings || []).map((id) => toppingItems.find((topping) => topping.id === id)).filter(Boolean);
    const itemTotal =
      (drink?.price || 0) +
      (size?.price || 0) +
      (option?.price || 0) +
      toppings.reduce((sum, topping) => sum + topping.price, 0);

    return {
      ...item,
      drinkId: drink?.id || item.drinkId || "",
      drink: drink?.name || item.drink || "",
      category: drink?.category || item.category || "",
      size: size?.id || "",
      sizeLabel: size?.label || "",
      temperature: itemTemperature,
      sweetness: sweetnessItems.includes(item.sweetness) ? item.sweetness : sweetnessItems[0] || "",
      ice: itemIce,
      option: option?.id || "",
      optionLabel: option?.label || "",
      toppings: toppings.map((topping) => topping.id),
      toppingLabels: toppings.map((topping) => topping.label),
      customizations: [],
      customizationsComplete: true,
      total: itemTotal,
    };
  };
  const preparedReservationItems = reservationItems.map(normalizeReservationItem).filter((item) => item.drink);
  const reservationTotal = preparedReservationItems.reduce((sum, item) => sum + item.total, 0);
  const displayTotal = catalogMode ? reservationTotal : preparedReservationItems.length ? reservationTotal : total;
  const memberCoupons = memberProfile?.coupons || [];
  const selectedCoupon = memberCoupons.find((coupon) => coupon.id === selectedCouponId);
  const couponDiscount = selectedCoupon ? Math.min(getCouponDiscountAmount(selectedCoupon, displayTotal), Math.max(0, displayTotal - 1)) : 0;
  const paymentTotal = Math.max(0, displayTotal - couponDiscount);

  const createReservationItem = ({
    drink,
    size = selectedSize,
    itemTemperature = selectedTemperature,
    itemSweetness = selectedSweetness,
    itemIce = selectedIce,
    option = selectedOption,
    toppings = selectedToppings,
    customizations = null,
  }) => {
    const itemStructuredGroups = customizationGroupsForDrink(drink);
    const usesStructuredCustomizations = itemStructuredGroups.length > 0;
    const effectiveCustomizations = Array.isArray(customizations)
      ? customizations
      : drink?.id === selectedDrink?.id
        ? selectedCustomizations
        : [];
    const effectiveSelections = Object.fromEntries(
      effectiveCustomizations.map((customization) => [customization.groupId, customization.optionIds || []]),
    );
    const fields = usesStructuredCustomizations
      ? structuredCustomizationFields(effectiveCustomizations)
      : {
          size: size?.id || "",
          sizeLabel: size?.label || "",
          temperature: itemTemperature,
          sweetness: itemSweetness,
          ice: itemIce,
          option: option?.id || "",
          optionLabel: option?.label || "",
          toppings: toppings.map((item) => item.id),
          toppingLabels: toppings.map((item) => item.label),
        };
    const itemTotal =
      (drink?.price || 0) +
      (usesStructuredCustomizations
        ? customizationPrice(effectiveCustomizations)
        : (size?.price || 0) +
          (option?.price || 0) +
          toppings.reduce((sum, item) => sum + item.price, 0));

    return {
      id: `${drink?.id || drink?.name || "drink"}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      drinkId: drink?.id || "",
      drink: drink?.name || "",
      category: drink?.category || category,
      ...fields,
      customizations: usesStructuredCustomizations ? effectiveCustomizations : [],
      customizationsComplete: usesStructuredCustomizations
        ? hasRequiredCustomizations(itemStructuredGroups, effectiveSelections)
        : true,
      total: itemTotal,
    };
  };

  useEffect(() => {
    if (hasLoadedReservationItems) return;
    let stored = [];

    try {
      stored = JSON.parse(window.localStorage.getItem(RESERVATION_CART_KEY) || "[]");
    } catch {
      stored = [];
    }

    if (Array.isArray(stored) && stored.length) {
      const defaultSize = findById(menu.sizes, "regular") || menu.sizes[0];
      const defaultOption = findById(menu.options, "none") || menu.options[0];
      const nextItems = stored
        .map((storedItem) => {
          const drink =
            menu.drinks.find((item) => item.id === storedItem.drinkId) ||
            menu.drinks.find((item) => item.name === storedItem.drinkName);
          if (!drink || drink.isAvailable === false || drink.websiteEnabled === false) return null;
          const itemTemperature = drink.temperatures?.includes("ICE") ? "ICE" : drink.temperatures?.[0] || "ICE";
          const itemIce = itemTemperature === "HOT" ? menu.hotIce : menu.ice[0] || "";
          return createReservationItem({
            drink,
            size: defaultSize,
            itemTemperature,
            itemSweetness: menu.sweetness[0] || "",
            itemIce,
            option: defaultOption,
            toppings: [],
          });
        })
        .filter(Boolean);

      setReservationItems(nextItems);
      try {
        window.localStorage.removeItem(RESERVATION_CART_KEY);
      } catch {
        // Ignore storage cleanup failures.
      }
    }

    setHasLoadedReservationItems(true);
  }, [hasLoadedReservationItems, menu]);

  useEffect(() => {
    if (selectedDrink && selectedDrink.name !== drinkName) {
      setDrinkName(selectedDrink.name);
    }
  }, [drinkName, selectedDrink]);

  useEffect(() => {
    setCustomizationSelections({});
  }, [selectedDrink?.id]);

  useEffect(() => {
    if (!selectedCouponId) return;
    if (!memberCoupons.some((coupon) => coupon.id === selectedCouponId)) setSelectedCouponId("");
  }, [memberCoupons, selectedCouponId]);

  const submitOrder = async (event) => {
    event.preventDefault();
    if (reservationsPaused) return;
    if (!shortagePreference) {
      setNote(t("欠品時の対応"));
      return;
    }
    const nextMinimum = getNextAvailablePickupDateTime(stores.find((item) => item.id === store)?.hours, minimumPickupMinutes);
    const safePickupDate = pickupDate < nextMinimum.date ? nextMinimum.date : pickupDate;
    const safePickup =
      safePickupDate === nextMinimum.date && pickup < nextMinimum.time ? nextMinimum.time : pickup;
    setMinimumPickup(nextMinimum);
    setPickupDate(safePickupDate);
    setPickup(safePickup);

    const selectedItem =
      !catalogMode && selectedDrink ? normalizeReservationItem(createReservationItem({ drink: selectedDrink })) : null;
    const orderItems = preparedReservationItems.length ? preparedReservationItems : selectedItem ? [selectedItem] : [];
    if (orderItems.some((item) => item.customizationsComplete === false)) {
      setNote(t("必須のカスタマイズを選択してください。"));
      return;
    }
    const drinkSummary =
      orderItems.length === 1
        ? orderItems[0].drink
        : orderItems.map((item, index) => `${index + 1}. ${item.drink}`).join(" / ");
    const orderTotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const order = {
      store,
      drink: selectedItem?.drink || "",
      category,
      size: selectedItem?.size || "",
      temperature: selectedItem?.temperature || "",
      sweetness: selectedItem?.sweetness || "",
      ice: selectedItem?.ice || "",
      option: selectedItem?.option || "",
      toppings: selectedItem?.toppings || [],
      items: orderItems.map((item) => ({
        drink: item.drink,
        category: item.category,
        size: item.size,
        temperature: item.temperature,
        sweetness: item.sweetness,
        ice: item.ice,
        option: item.option,
        toppings: item.toppings,
        customizations: item.customizations || [],
      })),
      pickupDate: safePickupDate,
      pickup: safePickup,
      name: customerName,
      phone: customerPhone,
      memberToken: memberProfile?.publicToken || "",
      memberName: memberProfile ? customerName : "",
      memberEmail: memberProfile?.email || "",
      memberPhone: memberProfile?.phone || "",
      couponId: selectedCouponId,
      shortagePreference,
      completionPath: language === "ja" ? "/order-complete" : `/${language}/order-complete`,
      completionSummary: {
        name: customerName,
        drink: drinkSummary,
        size: orderItems.length === 1 ? orderItems[0].sizeLabel : `${orderItems.length}点`,
        temperature: orderItems.length === 1 ? orderItems[0].temperature : "複数商品",
        sweetness: orderItems.length === 1 ? formatSweetnessLabel(orderItems[0].sweetness) : "商品ごと",
        ice: orderItems.length === 1 ? formatIceLabel(orderItems[0].ice) : "商品ごと",
        option: orderItems.length === 1 ? orderItems[0].optionLabel : "商品ごと",
        toppings: orderItems.length === 1 ? orderItems[0].toppingLabels : orderItems.map((item) => item.drink),
        total: paymentTotal,
        phone: customerPhone,
      },
      total: paymentTotal,
      labels: {
        drink: drinkSummary,
        size: orderItems.length === 1 ? orderItems[0].sizeLabel : `${orderItems.length}点`,
        temperature: orderItems.length === 1 ? orderItems[0].temperature : "複数商品",
        option: orderItems.length === 1 ? orderItems[0].optionLabel : "商品ごと",
        toppings: orderItems.length === 1 ? orderItems[0].toppingLabels : orderItems.map((item) => item.drink),
      },
    };

    setNote(
      `${order.pickupDate} ${order.pickup} 受け取り：${order.labels.drink}、合計${formatPrice(order.total)}でSquare決済を作成しています。`,
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
      const publicErrorMessage = error?.message && !unsafeCheckoutErrorPattern.test(error.message) ? error.message : "";
      const checkoutErrorMessage =
        error.code === "SQUARE_NOT_CONFIGURED"
          ? "Square設定が未完了です。店舗側でVercelの環境変数を設定してください。"
          : unavailableCheckoutErrorMessages.has(error.message)
            ? unavailableCheckoutMessage
          : error.message === "Pickup time is outside store hours"
            ? "現在は営業時間外です。予約できる最短の受け取り時間を選択してください。"
            : error.message === "Reservations are temporarily paused for this store"
              ? "現在、この店舗では受け取り予約を停止しています。"
              : publicErrorMessage || "決済画面を作成できませんでした。時間をおいて再度お試しください。";
      setNote(checkoutErrorMessage);
      setIsSubmitting(false);
    }
  };

  const addSelectedReservationItem = () => {
    if (!selectedDrink) return;
    if (structuredGroups.length && !structuredCustomizationsComplete) {
      setNote(t("必須のカスタマイズを選択してください。"));
      return;
    }
    setReservationItems((current) => [...current, createReservationItem({ drink: selectedDrink })]);
    setNote(t("カートに追加しました。ほかの商品も続けて選べます。"));
  };
  const selectCatalogDrink = (drink) => {
    setCategory(drink.category);
    setDrinkName(drink.name);
    setToppingIds([]);
    setCustomizationSelections({});
    setDetailDrinkId(drink.id);
  };
  const continueToCustomize = () => {
    setDetailDrinkId("");
    window.requestAnimationFrame(() => {
      document.getElementById("product-customize")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const updateReservationItem = (itemId, patch) => {
    setReservationItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;
        const next = { ...item, ...patch };
        return normalizeReservationItem(next);
      }),
    );
  };
  const updateCustomizationSelection = (groupId, optionIds) => {
    setCustomizationSelections((current) =>
      normalizeCustomizationSelections(structuredGroups, {
        ...current,
        [groupId]: optionIds,
      }),
    );
  };
  const displayNote = note ? t(note) : t(DEFAULT_NOTE);

  return (
    <section
      className={`reserve-section${catalogMode ? " catalog-order-section" : ""}`}
      id={catalogMode ? "order-menu" : "reserve"}
      aria-labelledby="reserve-title"
      data-react-reservation-form
    >
      <div className="reserve-panel">
        <p className="eyebrow eyebrow-with-decor">
          <img src="/assets/decor/speed-lines.png" alt="" aria-hidden="true" />
          {catalogMode ? "order & pickup" : "pickup desk"}
        </p>
        <h2 id="reserve-title" className="heading-with-decor">
          {catalogMode ? t("商品を選ぶ") : t("受け取り予約")}
          <img src="/assets/decor/heart-fill.png" alt="" aria-hidden="true" />
        </h2>
        {catalogMode ? (
          <>
            <p className="catalog-order-lead">
              {t("カテゴリーから商品を選び、サイズ・甘さ・氷・トッピングをカスタマイズしてカートに追加してください。")}
            </p>
            <div className="catalog-menu-layout">
              <div className="catalog-menu-toolbar">
                <nav className="catalog-category-nav" aria-label={t("商品カテゴリー")}>
                  {catalogCategories.map((item) => (
                    <a href={`#category-${item.id}`} key={item.id}>
                      {menuText(item, item.label)}
                    </a>
                  ))}
                </nav>
              </div>
              <div className="catalog-category-list">
                {catalogCategories.map((item) => (
                  <section className="catalog-category" id={`category-${item.id}`} key={item.id}>
                    <div className="catalog-category-heading">
                      <h3>{menuText(item, item.label)}</h3>
                      <span>{item.drinks.length} items</span>
                    </div>
                    <div className="catalog-product-grid">
                      {item.drinks.map((drink) => {
                        const unavailable = drink.isAvailable === false;
                        return (
                          <button
                            className={`catalog-product-card${unavailable ? " is-unavailable" : ""}`}
                            type="button"
                            onClick={() => { if (!unavailable) selectCatalogDrink(drink); }}
                            aria-haspopup="dialog"
                            disabled={unavailable}
                            key={drink.id}
                          >
                            <span className="catalog-product-photo">
                              {drink.imageUrl ? (
                                <img src={normalizeAssetUrl(drink.imageUrl)} alt="" />
                              ) : (
                                <span aria-hidden="true">nanacha</span>
                              )}
                            </span>
                            <span className="catalog-product-copy">
                              {promotionPrefixText(drink) ? (
                                <span className="menu-promotion-prefix">{promotionPrefixText(drink)}</span>
                              ) : null}
                              <strong>{menuText(drink, drink.name)}</strong>
                              {drink.description ? <small>{menuDescription(drink)}</small> : null}
                              <span>{formatPrice(drink.price)}〜{unavailable ? ` / ${t("売切")}` : ""}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
            {detailDrink ? (
              <div
                className="catalog-product-dialog-backdrop"
                role="presentation"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setDetailDrinkId("");
                }}
              >
                <section
                  className="catalog-product-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="catalog-product-dialog-title"
                >
                  <button
                    className="catalog-product-dialog-close"
                    type="button"
                    onClick={() => setDetailDrinkId("")}
                    aria-label={t("閉じる")}
                  >
                    ×
                  </button>
                  <div className="catalog-product-dialog-photo">
                    {detailDrink.imageUrl ? (
                      <img
                        src={normalizeAssetUrl(detailDrink.imageUrl)}
                        alt={menuText(detailDrink, detailDrink.name)}
                      />
                    ) : (
                      <span aria-hidden="true">nanacha</span>
                    )}
                  </div>
                  <div className="catalog-product-dialog-copy">
                    {promotionPrefixText(detailDrink) ? (
                      <span className="menu-promotion-prefix">{promotionPrefixText(detailDrink)}</span>
                    ) : null}
                    <span className="catalog-product-dialog-category">
                      {menuText(
                        menu.categories.find((item) => item.id === detailDrink.category),
                        menu.categories.find((item) => item.id === detailDrink.category)?.label || "",
                      )}
                    </span>
                    <h3 id="catalog-product-dialog-title">{menuText(detailDrink, detailDrink.name)}</h3>
                    <strong className="catalog-product-dialog-price">{formatPrice(detailDrink.price)}〜</strong>
                    <div className="catalog-product-dialog-description-scroll">
                      {detailDrink.description ? (
                        <p className="catalog-product-dialog-description">{menuDescription(detailDrink)}</p>
                      ) : null}
                    </div>
                    <button
                      className="catalog-product-dialog-continue"
                      type="button"
                      onClick={continueToCustomize}
                    >
                      {t("カスタマイズへ進む")}
                    </button>
                  </div>
                </section>
              </div>
            ) : null}
          </>
        ) : null}
        <form
          className={`reserve-form${catalogMode ? " catalog-order-form" : ""}`}
          id={catalogMode ? "product-customize" : undefined}
          onSubmit={submitOrder}
        >
          {reservationsPaused ? <div className="reservation-closed-notice">{t(reservationPauseMessage)}</div> : null}
          {catalogMode ? <h3 className="catalog-customize-title">{t("選択した商品のカスタマイズ")}</h3> : null}
          {!fixedStoreId ? (
            <label>
              <span>{t("店舗")}</span>
              <select value={store} onChange={(event) => setStore(event.target.value)}>
                {(menu.stores?.length ? menu.stores : [{ id: "kiyokawa", label: "福岡清川店" }]).map((item) => (
                  <option value={item.id} key={item.id}>
                    {menuText(item, item.label)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {!catalogMode ? (
            <>
              <label>
                <span>{t("カテゴリー")}</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  {menu.categories.map((item) => (
                    <option value={item.id} key={item.id}>
                      {menuText(item, item.label)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="reservation-drink-field">
                <span>{t("ドリンク")}</span>
                <select value={selectedDrink?.name || ""} onChange={(event) => setDrinkName(event.target.value)}>
                  {drinks.length ? (
                    drinks.map((drink) => (
                      <option value={drink.name} key={drink.id}>
                        {menuText(drink, drink.name)} {formatPrice(drink.price)}
                      </option>
                    ))
                  ) : (
                    <option value="">{t("予約できる商品がありません")}</option>
                  )}
                </select>
              </label>
            </>
          ) : null}
          {selectedDrink ? (
            <div className="reservation-live-price" aria-live="polite" aria-atomic="true">
              <span>{t("現在の価格")}</span>
              <strong>{formatPrice(total)}</strong>
            </div>
          ) : null}
          {selectedDrink?.imageUrl ? (
            <div className="reservation-drink-preview">
              <img src={normalizeAssetUrl(selectedDrink.imageUrl)} alt={menuText(selectedDrink, selectedDrink.name)} />
              <div>
                {!catalogMode ? <span>{t("選択中の商品")}</span> : null}
                {promotionPrefixText(selectedDrink) ? (
                  <span className="menu-promotion-prefix">{promotionPrefixText(selectedDrink)}</span>
                ) : null}
                <strong>{menuText(selectedDrink, selectedDrink.name)}</strong>
                {!catalogMode && selectedDrink.description ? <p>{menuDescription(selectedDrink)}</p> : null}
              </div>
            </div>
          ) : null}
          {structuredGroups.length ? (
            <StructuredCustomizationFields
              groups={structuredGroups}
              selections={normalizedCustomizationSelections}
              onChange={updateCustomizationSelection}
              menuText={menuText}
              t={t}
            />
          ) : (
            <>
              <label className="reservation-size-field">
                <span>{t("サイズ")}</span>
                <select value={selectedSize?.id || ""} onChange={(event) => setSizeId(event.target.value)}>
                  {availableSizes.map((size) => (
                    <option value={size.id} key={size.id}>
                      {menuText(size, size.label)} ({formatDelta(size.price)})
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
                <select value={selectedSweetness} onChange={(event) => setSweetness(event.target.value)}>
                  {sweetnessOptions.map((item) => (
                    <option value={item} key={item}>
                      {rawText(item)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("氷の量")}</span>
                <select value={selectedIce} onChange={(event) => setIce(event.target.value)}>
                  {iceOptions.map((item) => (
                    <option value={item} key={item}>
                      {rawText(item)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("オプション")}</span>
                <select value={selectedOption?.id || ""} onChange={(event) => setOptionId(event.target.value)}>
                  {availableOptions.map((option) => (
                    <option value={option.id} key={option.id}>
                      {menuText(option, option.label)} ({formatDelta(option.price)})
                    </option>
                  ))}
                </select>
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
                        {menuText(topping, topping.label)} ({formatDelta(topping.price)})
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          <label className="reservation-pickup-date-field">
            <span>{t("受け取り日")}</span>
            <input
              type="date"
              value={pickupDate}
              min={minimumPickup.date}
              onChange={(event) => setPickupDate(event.target.value)}
            />
          </label>
          <label className="reservation-pickup-time-field">
            <span>{t("受け取り時間")}</span>
            <input
              type="time"
              value={pickup}
              min={pickupDate === minimumPickup.date ? minimumPickup.time : undefined}
              onChange={(event) => setPickup(event.target.value)}
            />
          </label>
          <label className="reservation-customer-field">
            <span>{t("お名前")}</span>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder={t("例: 山田")}
              autoComplete="name"
              required
            />
          </label>
          <label className="reservation-customer-field">
            <span>{t("電話番号")}</span>
            <input
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="090..."
              inputMode="tel"
              autoComplete="tel"
              required
            />
          </label>
          {!memberProfile ? (
            <div className="reservation-member-panel">
              <div>
                <span>{t("会員ポイント")}</span>
                <strong>{t("ログインするとポイントが貯まります。")}</strong>
                <p>{t("予約だけなら登録なしで進めます。ポイント利用には会員登録・ログインが必要です。")}</p>
              </div>
              <a href={memberHref}>
                {t("会員登録・ログイン")}
              </a>
            </div>
          ) : null}
          {memberProfile && memberCoupons.length ? (
            <div className="reservation-coupon-panel">
              <span>{t("クーポン")}</span>
              {memberCoupons.map((coupon) => (
                <button
                  key={coupon.id}
                  className={selectedCouponId === coupon.id ? "is-selected" : ""}
                  type="button"
                  onClick={() => setSelectedCouponId((current) => (current === coupon.id ? "" : coupon.id))}
                >
                  <strong>{coupon.name}</strong>
                  <small>{formatCouponValue(coupon)}</small>
                </button>
              ))}
            </div>
          ) : null}
          <button
            className="add-reservation-item-button"
            type="button"
            disabled={reservationsPaused || !hasAvailableDrinks || !selectedDrink}
            onClick={addSelectedReservationItem}
          >
            {reservationsPaused ? t("現在予約受付を停止しています") : t("この商品をカートに追加")}
          </button>
          <div className="reservation-list" id={catalogMode ? "cart" : undefined}>
            <div className="reservation-list-heading">
              <span>{catalogMode ? t("カート") : t("予約リスト")}</span>
              {reservationItems.length ? (
                <button type="button" onClick={() => setReservationItems([])}>
                  {t("クリア")}
                </button>
              ) : null}
            </div>
            {reservationItems.length ? (
              <ul>
                {preparedReservationItems.map((item, index) => {
                  const drink = getReservationDrink(item);
                  const itemTemperatures = drink?.temperatures?.length ? drink.temperatures : ["ICE"];
                  const itemSizes = getReservationSizes(drink);
                  const itemSweetnessOptions = getReservationSweetness(drink);
                  const itemIceOptions = getReservationIceOptions(item, drink);
                  const itemOptions = getReservationOptions(drink);
                  const itemToppings = getReservationToppings(item, drink);

                  return (
                    <li className="reservation-item-card" key={item.id}>
                      <div className="reservation-item-card-heading">
                        {drink?.imageUrl ? (
                          <img
                            className="reservation-item-thumb"
                            src={normalizeAssetUrl(drink.imageUrl)}
                            alt={menuText(drink, item.drink)}
                          />
                        ) : null}
                        <div>
                          {promotionPrefixText(drink) ? (
                            <span className="menu-promotion-prefix">{promotionPrefixText(drink)}</span>
                          ) : null}
                          <span>
                            {index + 1}. {menuText(drink, item.drink)}
                          </span>
                          <small>{t("この1杯のカスタマイズ")}</small>
                        </div>
                        <strong>{formatPrice(item.total)}</strong>
                        <button
                          type="button"
                          aria-label={`${item.drink}を予約リストから削除`}
                          onClick={() =>
                            setReservationItems((current) => current.filter((currentItem) => currentItem.id !== item.id))
                          }
                        >
                          ×
                        </button>
                      </div>
                      {customizationGroupsForDrink(drink).length ? (
                        <div className="reservation-item-customizations">
                          {item.customizations.map((customization) => (
                            <div key={customization.groupId}>
                              <span>
                                {menuText(
                                  { name: customization.groupName, displayNames: customization.groupDisplayNames },
                                  customization.groupName,
                                )}
                              </span>
                              <strong>
                                {customization.optionLabels.map((label, optionIndex) =>
                                  menuText(
                                    { name: label, displayNames: customization.optionDisplayNames?.[optionIndex] },
                                    label,
                                  ),
                                ).join("、")}
                              </strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="reservation-item-controls">
                            <label>
                              <span>{t("サイズ")}</span>
                              <select value={item.size} onChange={(event) => updateReservationItem(item.id, { size: event.target.value })}>
                                {itemSizes.map((size) => (
                                  <option value={size.id} key={size.id}>
                                    {menuText(size, size.label)} ({formatDelta(size.price)})
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              <span>{t("温度")}</span>
                              <select
                                value={item.temperature}
                                onChange={(event) =>
                                  updateReservationItem(item.id, {
                                    temperature: event.target.value,
                                    ice: event.target.value === "HOT" ? menu.hotIce : menu.ice[0] || "",
                                  })
                                }
                              >
                                {itemTemperatures.map((itemTemperature) => (
                                  <option value={itemTemperature} key={itemTemperature}>
                                    {itemTemperature}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              <span>{t("甘さ")}</span>
                              <select value={item.sweetness} onChange={(event) => updateReservationItem(item.id, { sweetness: event.target.value })}>
                                {itemSweetnessOptions.map((sweetnessItem) => (
                                  <option value={sweetnessItem} key={sweetnessItem}>
                                    {rawText(sweetnessItem)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              <span>{t("氷の量")}</span>
                              <select value={item.ice} onChange={(event) => updateReservationItem(item.id, { ice: event.target.value })}>
                                {itemIceOptions.map((iceItem) => (
                                  <option value={iceItem} key={iceItem}>
                                    {rawText(iceItem)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              <span>{t("オプション")}</span>
                              <select value={item.option} onChange={(event) => updateReservationItem(item.id, { option: event.target.value })}>
                                {itemOptions.map((option) => (
                                  <option value={option.id} key={option.id}>
                                    {menuText(option, option.label)} ({formatDelta(option.price)})
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <fieldset className="reservation-item-toppings">
                            <legend>{t("トッピング")}</legend>
                            <div>
                              {itemToppings.map((topping) => (
                                <label key={topping.id}>
                                  <input
                                    type="checkbox"
                                    checked={item.toppings.includes(topping.id)}
                                    onChange={(event) =>
                                      updateReservationItem(item.id, {
                                        toppings: event.target.checked
                                          ? [...item.toppings, topping.id]
                                          : item.toppings.filter((toppingId) => toppingId !== topping.id),
                                      })
                                    }
                                  />
                                  <span>
                                    {menuText(topping, topping.label)} ({formatDelta(topping.price)})
                                  </span>
                                </label>
                              ))}
                            </div>
                          </fieldset>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>
                {catalogMode
                  ? t("商品を選んでカートに追加してください。")
                  : t("複数の商品を予約する場合は、商品を選んで予約リストに追加してください。")}
              </p>
            )}
          </div>
          <p className="order-total">
            <span>{t("合計")} {formatPrice(paymentTotal)}</span>
            {couponDiscount ? <small>{t("クーポン値引き")} -{formatPrice(couponDiscount)}</small> : null}
          </p>
          <fieldset className="shortage-preference">
            <legend>{t("欠品時の対応")}</legend>
            <p>{t("ご注文の商品を確実にご用意できるよう在庫管理に努めておりますが、複数の販売先で在庫を共有しているため、ご注文確定後にやむを得ず欠品が判明する場合があります。万一の場合のご希望をお選びください。")}</p>
            <label>
              <input type="radio" name="shortagePreference" checked={shortagePreference === "substitute_or_refund"} onChange={() => setShortagePreference("substitute_or_refund")} />
              <span><strong>{t("同等以上の同類商品へ変更")}</strong><small>{t("適切な代替品がある場合に限り変更します。ご用意できない場合は、該当する商品・オプションを返金します。")}</small></span>
            </label>
            <label>
              <input type="radio" name="shortagePreference" checked={shortagePreference === "refund"} onChange={() => setShortagePreference("refund")} />
              <span><strong>{t("欠品した商品・オプションをキャンセルして返金")}</strong><small>{t("代替品への変更は行わず、ご用意できない分を返金します。")}</small></span>
            </label>
          </fieldset>
          <button
            className="checkout-button"
            type="submit"
            disabled={
              reservationsPaused ||
              isSubmitting ||
              !hasAvailableDrinks ||
              !shortagePreference ||
              !selectedDrink ||
              (catalogMode && !reservationItems.length)
            }
          >
            {reservationsPaused ? t("現在予約受付を停止しています") : isSubmitting ? t("決済画面を作成中...") : t("Squareで注文・支払い")}
          </button>
          <p className="form-note">
            {reservationsPaused ? t(reservationPauseMessage) : hasAvailableDrinks ? displayNote : t("現在、この店舗で予約できる商品はありません。")}
          </p>
        </form>
        {catalogMode && preparedReservationItems.length ? (
          <a
            className="catalog-floating-cart"
            href="#cart"
            aria-label={`${t("カート")} ${preparedReservationItems.length}点 ${formatPrice(reservationTotal)}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 4h2l2.1 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H7" />
              <circle cx="10" cy="19" r="1.4" />
              <circle cx="17" cy="19" r="1.4" />
            </svg>
            <span>{t("カート")}</span>
            <strong>{preparedReservationItems.length}</strong>
            <b>{formatPrice(reservationTotal)}</b>
          </a>
        ) : null}
      </div>
    </section>
  );
}
