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
  return values.length ? new Set(values.map(String)) : null;
};
const filterAllowedIds = (items, drink, field) => {
  const allowed = allowedSet(drink, field);
  if (!allowed) return items;
  const filtered = items.filter((item) => allowed.has(item.id));
  return filtered.length ? filtered : items;
};
const filterAllowedValues = (items, drink, field) => {
  const allowed = allowedSet(drink, field);
  if (!allowed) return items;
  const filtered = items.filter((item) => allowed.has(item));
  return filtered.length ? filtered : items;
};
const filterAllowedOptions = (items, drink) => {
  const allowed = allowedSet(drink, "allowedOptions");
  return items.filter((item) => item.id === "none" || !allowed || allowed.has(item.id));
};
const RESERVATION_CART_KEY = "nanacha-reservation-cart";
const DEFAULT_NOTE = "注文内容を確認して、Squareの決済画面へ進みます。";
const DEFAULT_RESERVATION_DRINK_NAME = "黒糖タピオカミルク";
const DEFAULT_MINIMUM_PICKUP_MINUTES = 5;
const MENU_REFRESH_INTERVAL_MS = 15000;
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

export function ReservationForm({ initialMenu, stores = [] }) {
  const { language, setLanguage, t } = useI18n();
  const menuText = (item, fallback = "") => {
    const source = item && typeof item === "object" ? item : {};
    const original = fallback || source.label || source.name || "";
    return source.displayNames?.[language] || source.displayNames?.en || t(original);
  };
  const menuDescription = (item) => {
    const source = item && typeof item === "object" ? item : {};
    const original = source.description || "";
    return source.descriptionDisplayNames?.[language] || source.descriptionDisplayNames?.en || t(original);
  };
  const rawText = (value) => t(value);
  const initialStoreId = initialMenu.selectedStoreId || initialMenu.stores?.[0]?.id || "kiyokawa";
  const initialStore = stores.find((item) => item.id === initialStoreId);
  const initialMinimumPickupMinutes = normalizeMinimumPickupMinutes(initialMenu.storeOperation?.minimumPickupMinutes);
  const initialPickup = getNextAvailablePickupDateTime(initialStore?.hours, initialMinimumPickupMinutes);
  const [menu, setMenu] = useState(initialMenu);
  const [store, setStore] = useState(initialStoreId);
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
  const [minimumPickup, setMinimumPickup] = useState(initialPickup);
  const [pickupDate, setPickupDate] = useState(initialPickup.date);
  const [pickup, setPickup] = useState(initialPickup.time);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [memberProfile, setMemberProfile] = useState(null);
  const [selectedCouponId, setSelectedCouponId] = useState("");
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
    const loadMenu = (resetSelection = false) => {
      fetch(`/api/menu?store=${encodeURIComponent(store)}`, { headers: { Accept: "application/json" }, cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (!active || !data?.categories || !Array.isArray(data.drinks)) return;

          const availableDrinks = data.drinks.filter((drink) => drink.isAvailable !== false && drink.websiteEnabled !== false);
          const categoriesWithDrinks = new Set(availableDrinks.map((drink) => drink.category));
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

    loadMenu(true);
    const interval = window.setInterval(() => loadMenu(false), MENU_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [store]);

  useEffect(() => {
    const nextPickup = getNextAvailablePickupDateTime(stores.find((item) => item.id === store)?.hours, minimumPickupMinutes);
    setMinimumPickup(nextPickup);
    setPickupDate(nextPickup.date);
    setPickup(nextPickup.time);
  }, [minimumPickupMinutes, store, stores]);

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
    (selectedSize?.price || 0) +
    (selectedOption?.price || 0) +
    selectedToppings.reduce((sum, item) => sum + item.price, 0);
  const hasAvailableDrinks = menu.drinks.some(
    (drink) => drink.isAvailable !== false && drink.websiteEnabled !== false,
  );
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
      total: itemTotal,
    };
  };
  const preparedReservationItems = reservationItems.map(normalizeReservationItem).filter((item) => item.drink);
  const reservationTotal = preparedReservationItems.reduce((sum, item) => sum + item.total, 0);
  const displayTotal = preparedReservationItems.length ? reservationTotal : total;
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
  }) => {
    const itemTotal =
      (drink?.price || 0) +
      (size?.price || 0) +
      (option?.price || 0) +
      toppings.reduce((sum, item) => sum + item.price, 0);

    return {
      id: `${drink?.id || drink?.name || "drink"}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      drinkId: drink?.id || "",
      drink: drink?.name || "",
      category: drink?.category || category,
      size: size?.id || "",
      sizeLabel: size?.label || "",
      temperature: itemTemperature,
      sweetness: itemSweetness,
      ice: itemIce,
      option: option?.id || "",
      optionLabel: option?.label || "",
      toppings: toppings.map((item) => item.id),
      toppingLabels: toppings.map((item) => item.label),
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
    if (!selectedCouponId) return;
    if (!memberCoupons.some((coupon) => coupon.id === selectedCouponId)) setSelectedCouponId("");
  }, [memberCoupons, selectedCouponId]);

  const submitOrder = async (event) => {
    event.preventDefault();
    if (reservationsPaused) return;
    const nextMinimum = getNextAvailablePickupDateTime(stores.find((item) => item.id === store)?.hours, minimumPickupMinutes);
    const safePickupDate = pickupDate < nextMinimum.date ? nextMinimum.date : pickupDate;
    const safePickup =
      safePickupDate === nextMinimum.date && pickup < nextMinimum.time ? nextMinimum.time : pickup;
    setMinimumPickup(nextMinimum);
    setPickupDate(safePickupDate);
    setPickup(safePickup);

    const selectedItem = selectedDrink ? normalizeReservationItem(createReservationItem({ drink: selectedDrink })) : null;
    const orderItems = preparedReservationItems.length ? preparedReservationItems : selectedItem ? [selectedItem] : [];
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
    setReservationItems((current) => [...current, createReservationItem({ drink: selectedDrink })]);
    setNote(t("予約リストに追加しました。ほかの商品も続けて選べます。"));
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
  const displayNote = note ? t(note) : t(DEFAULT_NOTE);

  return (
    <section className="reserve-section" id="reserve" aria-labelledby="reserve-title" data-react-reservation-form>
      <div className="reserve-panel">
        <p className="eyebrow eyebrow-with-decor">
          <img src="/assets/decor/speed-lines.png" alt="" aria-hidden="true" />
          pickup desk
        </p>
        <h2 id="reserve-title" className="heading-with-decor">
          {t("受け取り予約")}
          <img src="/assets/decor/heart-fill.png" alt="" aria-hidden="true" />
        </h2>
        <form className="reserve-form" onSubmit={submitOrder}>
          {reservationsPaused ? <div className="reservation-closed-notice">{t(reservationPauseMessage)}</div> : null}
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
          {selectedDrink?.imageUrl ? (
            <div className="reservation-drink-preview" aria-live="polite">
              <img src={normalizeAssetUrl(selectedDrink.imageUrl)} alt={menuText(selectedDrink, selectedDrink.name)} />
              <div>
                <span>{t("選択中の商品")}</span>
                <strong>{menuText(selectedDrink, selectedDrink.name)}</strong>
                {selectedDrink.description ? <p>{menuDescription(selectedDrink)}</p> : null}
                <small>{formatPrice(selectedDrink.price)}</small>
              </div>
            </div>
          ) : null}
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
            {reservationsPaused ? t("現在予約受付を停止しています") : t("この商品を予約リストに追加")}
          </button>
          <div className="reservation-list">
            <div className="reservation-list-heading">
              <span>{t("予約リスト")}</span>
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
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>{t("複数の商品を予約する場合は、商品を選んで予約リストに追加してください。")}</p>
            )}
          </div>
          <p className="order-total">
            <span>{t("合計")} {formatPrice(paymentTotal)}</span>
            {couponDiscount ? <small>{t("クーポン値引き")} -{formatPrice(couponDiscount)}</small> : null}
          </p>
          <button className="checkout-button" type="submit" disabled={reservationsPaused || isSubmitting || !hasAvailableDrinks || !selectedDrink}>
            {reservationsPaused ? t("現在予約受付を停止しています") : isSubmitting ? t("決済画面を作成中...") : t("Squareで注文・支払い")}
          </button>
          <p className="form-note">
            {reservationsPaused ? t(reservationPauseMessage) : hasAvailableDrinks ? displayNote : t("現在、この店舗で予約できる商品はありません。")}
          </p>
        </form>
      </div>
    </section>
  );
}
