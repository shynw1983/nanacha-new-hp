const header = document.querySelector("[data-header]");
const form = document.querySelector(".reserve-form");
const note = document.querySelector("[data-note]");
const languageSelect = document.querySelector("[data-language-select]");
let orderData = window.NANACHA_MENU;
const menuCount = document.querySelector("[data-menu-count]");
const translationState = {
  language: localStorage.getItem("nanacha-language") || "ja",
  isApplying: false,
  originals: new WeakMap(),
  dictionaries: { ja: {} },
  observer: null,
  pendingTimer: null,
};
const TRANSLATABLE_SELECTOR = "header, main, footer";
const EXCLUDED_TRANSLATION_SELECTOR =
  "script, style, iframe, svg, canvas, img, [data-no-translate]";
const LANGUAGE_META = {
  ja: { htmlLang: "ja" },
  en: { htmlLang: "en" },
  zh: { htmlLang: "zh-Hans" },
  ko: { htmlLang: "ko" },
};

const syncHeader = () => {
  header.style.boxShadow =
    window.scrollY > 12 ? "0 12px 36px rgba(0, 0, 0, 0.05)" : "none";
};

if (header) {
  window.addEventListener("scroll", syncHeader, { passive: true });
  syncHeader();
}

const formatPrice = (price) => `¥${price.toLocaleString("ja-JP")}`;

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const shouldTranslateText = (text) => {
  const trimmed = text.replace(/\s+/g, " ").trim();

  if (!trimmed || trimmed.length < 2) {
    return false;
  }

  if (/^[\d\s:.,+¥%()/-]+$/.test(trimmed)) {
    return false;
  }

  return /[A-Za-z\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(trimmed);
};

const getTranslationRoots = () =>
  Array.from(document.querySelectorAll(TRANSLATABLE_SELECTOR)).filter(
    (root) => !root.closest(EXCLUDED_TRANSLATION_SELECTOR),
  );

const getOriginalText = (node) => {
  if (!translationState.originals.has(node)) {
    translationState.originals.set(node, node.nodeValue);
  }

  return translationState.originals.get(node);
};

const collectTranslatableNodes = () => {
  const nodes = [];

  getTranslationRoots().forEach((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;

        if (!parent || parent.closest(EXCLUDED_TRANSLATION_SELECTOR)) {
          return NodeFilter.FILTER_REJECT;
        }

        const original = getOriginalText(node);
        return shouldTranslateText(original) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }
  });

  return nodes;
};

const restoreOriginalLanguage = () => {
  translationState.isApplying = true;
  collectTranslatableNodes().forEach((node) => {
    node.nodeValue = getOriginalText(node);
  });
  translationState.isApplying = false;
};

const loadDictionary = async (language) => {
  if (translationState.dictionaries[language]) {
    return translationState.dictionaries[language];
  }

  const response = await fetch(`locales/${language}.json`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Missing locale file: ${language}`);
  }

  const dictionary = await response.json();
  translationState.dictionaries[language] = dictionary;
  return dictionary;
};

const translateTextWithDictionary = (original, dictionary) => {
  const key = original.replace(/\s+/g, " ").trim();
  const exact = dictionary[key];

  if (exact) {
    return exact;
  }

  let translated = key;
  const entries = Object.entries(dictionary)
    .filter(([source, value]) => source.length > 3 && value && translated.includes(source))
    .sort((a, b) => b[0].length - a[0].length);

  entries.forEach(([source, value]) => {
    translated = translated.split(source).join(value);
  });

  return translated === key ? original : translated;
};

const applyDictionary = (dictionary) => {
  translationState.isApplying = true;
  collectTranslatableNodes().forEach((node) => {
    const original = getOriginalText(node);
    node.nodeValue = translateTextWithDictionary(original, dictionary);
  });
  translationState.isApplying = false;
};

const translatePage = async (language, { isRefresh = false } = {}) => {
  if (!LANGUAGE_META[language]) {
    return;
  }

  translationState.language = language;
  localStorage.setItem("nanacha-language", language);
  document.documentElement.lang = LANGUAGE_META[language].htmlLang;

  if (languageSelect) {
    languageSelect.value = language;
  }

  if (language === "ja") {
    restoreOriginalLanguage();
    return;
  }

  document.body.classList.add("is-translating");

  if (languageSelect) {
    languageSelect.disabled = true;
  }

  try {
    const dictionary = await loadDictionary(language);
    applyDictionary(dictionary);
  } catch (error) {
    if (!isRefresh) {
      console.warn(error);
      restoreOriginalLanguage();
      translationState.language = "ja";
      localStorage.setItem("nanacha-language", "ja");

      if (languageSelect) {
        languageSelect.value = "ja";
      }
    }
  } finally {
    document.body.classList.remove("is-translating");

    if (languageSelect) {
      languageSelect.disabled = false;
    }
  }
};

const scheduleTranslationRefresh = () => {
  if (translationState.isApplying || translationState.language === "ja") {
    return;
  }

  window.clearTimeout(translationState.pendingTimer);
  translationState.pendingTimer = window.setTimeout(() => {
    translatePage(translationState.language, { isRefresh: true });
  }, 300);
};

const initTranslation = () => {
  if (languageSelect) {
    languageSelect.value = translationState.language;
    languageSelect.addEventListener("change", () => {
      translatePage(languageSelect.value);
    });
  }

  translationState.observer = new MutationObserver(scheduleTranslationRefresh);
  translationState.observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
};

const formatDelta = (price) => {
  if (price === 0) {
    return "¥0";
  }

  return `${price > 0 ? "+" : "-"}${formatPrice(Math.abs(price))}`;
};

const findById = (items, id) => items.find((item) => item.id === id);

const isTapiocaFreeCategory = (category) => orderData.tapiocaFreeCategories.includes(category);

const hasWhipByDefault = (category) => orderData.whippedCategories.includes(category);

const getAvailableToppings = (category) =>
  orderData.toppings.filter(
    (topping) =>
      !(topping.id === "no-tapioca" && isTapiocaFreeCategory(category)) &&
      !(topping.id === "no-whip" && !hasWhipByDefault(category)),
  );

const getSelectedOrder = () => {
  const data = new FormData(form);
  const drinkName = String(data.get("drink") || "");
  const drink = orderData.drinks.find((item) => item.name === drinkName);
  const size = findById(orderData.sizes, String(data.get("size") || ""));
  const temperature = String(data.get("temperature") || "");
  const selectedOption = findById(orderData.options, String(data.get("option") || ""));
  const toppingIds = data.getAll("toppings").map(String);
  const availableToppings = getAvailableToppings(drink?.category || "");
  const toppings = toppingIds.map((id) => findById(availableToppings, id)).filter(Boolean);
  const total =
    (drink?.price || 0) +
    (size?.price || 0) +
    (selectedOption?.price || 0) +
    toppings.reduce((sum, item) => sum + item.price, 0);

  return {
    drink: drinkName,
    category: String(data.get("category") || ""),
    size: String(data.get("size") || ""),
    temperature,
    sweetness: String(data.get("sweetness") || ""),
    ice: String(data.get("ice") || ""),
    option: String(data.get("option") || ""),
    toppings: toppingIds,
    pickup: String(data.get("pickup") || ""),
    total,
    labels: {
      drink: drink?.name || drinkName,
      size: size?.label || "",
      temperature,
      option: selectedOption?.label || "",
      toppings: toppings.map((item) => item.label),
    },
  };
};

const updateOrderTotal = () => {
  const total = document.querySelector("[data-order-total]");

  if (!total || !orderData) {
    return;
  }

  const order = getSelectedOrder();
  total.textContent = `合計 ${formatPrice(order.total)}`;
};

const fillSelect = (select, options) => {
  select.innerHTML = options.map((option) => `<option value="${option.value}">${option.label}</option>`).join("");
};

const formatTimeInput = (date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

const getMinimumPickupTime = () => {
  const now = new Date();
  const date = new Date(now);
  date.setMinutes(date.getMinutes() + 5);

  if (date.getDate() !== now.getDate()) {
    return "23:59";
  }

  return formatTimeInput(date);
};

const syncMenuCount = () => {
  if (menuCount && orderData) {
    menuCount.textContent = orderData.drinks.length;
  }
};

const getDirectPriceElement = (card) =>
  Array.from(card.children).find((element) => element.tagName === "SPAN");

const getStaticDrinkDescriptions = () => {
  const descriptions = new Map();

  document.querySelectorAll(".product-item, .drink-card").forEach((card) => {
    const heading = card.querySelector("h3");
    const description = card.querySelector("h3 + p");

    if (heading && description) {
      descriptions.set(heading.textContent.trim(), description.textContent.trim());
    }
  });

  return descriptions;
};

const staticDrinkDescriptions = getStaticDrinkDescriptions();

const getCategory = (categoryId) =>
  orderData?.categories.find((category) => category.id === categoryId);

const getCategoryLabel = (categoryId) => getCategory(categoryId)?.label || categoryId;

const renderDrinkCard = (drink, index) => `
  <article class="drink-card ${drink.isFeatured || index === 0 ? "featured" : ""}">
    ${
      drink.imageUrl
        ? `<img class="drink-photo" src="${escapeHtml(drink.imageUrl)}" alt="${escapeHtml(drink.name)}" />`
        : ""
    }
    <div>
      <p class="drink-tag">${escapeHtml(getCategoryLabel(drink.category))}</p>
      <h3>${escapeHtml(drink.name)}</h3>
      ${
        drink.description || staticDrinkDescriptions.get(drink.name)
          ? `<p>${escapeHtml(drink.description || staticDrinkDescriptions.get(drink.name))}</p>`
          : ""
      }
    </div>
    <span>${formatPrice(drink.price)}</span>
  </article>
`;

const renderHomepagePicks = () => {
  const grid = document.querySelector(".menu-section .menu-grid");

  if (!grid || !orderData) {
    return;
  }

  const recommended = orderData.drinks.filter((drink) => drink.isRecommended);
  const drinks = (recommended.length ? recommended : orderData.drinks).slice(0, 4);

  if (!drinks.length) {
    return;
  }

  grid.innerHTML = drinks.map(renderDrinkCard).join("");
};

const categoryDecor = (categoryId) =>
  ({
    frappe: "sparkle.png",
    milk: "tapioca-three.png",
    smoothie: "wave.png",
    "cheese-tea": "heart-fill.png",
    tea: "tail.png",
    special: "dog-heart.png",
    coffee: "tapioca-two.png",
    "tea-coffee": "sunglasses.png",
  })[categoryId] || "tapioca-one.png";

const renderMenuControls = () => {
  const controls = document.querySelector(".menu-controls");

  if (!controls || !orderData) {
    return;
  }

  controls.innerHTML = [
    `<button type="button" class="is-active" data-menu-filter="all">all</button>`,
    ...orderData.categories.map(
      (category) =>
        `<button type="button" data-menu-filter="${escapeHtml(category.id)}">${escapeHtml(category.label)}</button>`,
    ),
  ].join("");
};

const renderMenuProduct = (drink) => `
  <div class="product-item ${drink.imageUrl ? "with-photo" : "simple"}">
    ${
      drink.imageUrl
        ? `<img class="product-photo" src="${escapeHtml(drink.imageUrl)}" alt="${escapeHtml(drink.name)}" />`
        : ""
    }
    <div>
      <h3>${escapeHtml(drink.name)}</h3>
      ${drink.description ? `<p>${escapeHtml(drink.description)}</p>` : ""}
    </div>
    <span>${formatPrice(drink.price)}</span>
  </div>
`;

const renderFullMenu = () => {
  const fullMenu = document.querySelector(".full-menu");

  if (!fullMenu || !orderData) {
    return;
  }

  fullMenu.innerHTML = orderData.categories
    .map((category) => {
      const drinks = orderData.drinks.filter((drink) => drink.category === category.id);

      if (!drinks.length) {
        return "";
      }

      return `
        <article class="menu-category" data-menu-category="${escapeHtml(category.id)}">
          <div class="category-heading">
            <p class="eyebrow">${escapeHtml(category.id)}</p>
            <h2 class="heading-with-decor">
              ${escapeHtml(category.label)}
              <img src="assets/decor/${categoryDecor(category.id)}" alt="" aria-hidden="true" />
            </h2>
            ${category.note ? `<p class="category-note">${escapeHtml(category.note)}</p>` : ""}
          </div>
          <div class="product-list ${drinks.length > 2 ? "compact" : ""}">
            ${drinks.map(renderMenuProduct).join("")}
          </div>
        </article>
      `;
    })
    .join("");
};

const initMenuFilters = () => {
  const buttons = document.querySelectorAll("[data-menu-filter]");
  const categories = document.querySelectorAll("[data-menu-category]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.menuFilter;

      buttons.forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });

      categories.forEach((category) => {
        const isVisible = filter === "all" || category.dataset.menuCategory === filter;
        category.classList.toggle("is-hidden", !isVisible);
      });
    });
  });
};

const ensureProductImage = (card, drink) => {
  const currentImage = card.querySelector(".product-photo, .drink-photo");

  if (!drink.imageUrl) {
    return;
  }

  if (currentImage) {
    currentImage.src = drink.imageUrl;
    currentImage.alt = drink.name;
    return;
  }

  if (!card.classList.contains("product-item")) {
    return;
  }

  const heading = card.querySelector("h3");
  const price = getDirectPriceElement(card);

  if (!heading || !price) {
    return;
  }

  const image = document.createElement("img");
  image.className = "product-photo";
  image.src = drink.imageUrl;
  image.alt = drink.name;

  const copy = document.createElement("div");
  copy.append(heading);

  card.insertBefore(image, price);
  card.insertBefore(copy, price);
  card.classList.remove("simple");
  card.classList.add("with-photo");
};

const syncVisibleMenuCards = () => {
  if (!orderData) {
    return;
  }

  const drinksByName = new Map(orderData.drinks.map((drink) => [drink.name, drink]));
  const cards = document.querySelectorAll(".drink-card, .product-item");

  cards.forEach((card) => {
    const heading = card.querySelector("h3");
    const drink = heading ? drinksByName.get(heading.textContent.trim()) : null;

    if (!drink) {
      return;
    }

    const price = getDirectPriceElement(card);

    if (price) {
      price.textContent = formatPrice(drink.price);
    }

    ensureProductImage(card, drink);
  });
};

const loadRemoteMenuData = async () => {
  if (window.location.protocol === "file:") {
    return null;
  }

  try {
    const response = await fetch("/api/menu", {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const menu = await response.json();
    return Array.isArray(menu.drinks) && menu.drinks.length ? menu : null;
  } catch {
    return null;
  }
};

const initOrderForm = () => {
  if (!form || !note || !orderData) {
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  const categorySelect = form.querySelector("[data-category-select]");
  const drinkSelect = form.querySelector("[data-drink-select]");
  const sizeSelect = form.querySelector("[data-size-select]");
  const temperatureSelect = form.querySelector("[data-temperature-select]");
  const sweetnessSelect = form.querySelector("[data-sweetness-select]");
  const iceSelect = form.querySelector("[data-ice-select]");
  const optionSelect = form.querySelector("[data-option-select]");
  const pickupInput = form.querySelector("input[name='pickup']");
  const toppingList = form.querySelector("[data-topping-list]");

  const syncPickupTime = (forceDefault = false) => {
    const minimumPickup = getMinimumPickupTime();
    pickupInput.min = minimumPickup;

    if (forceDefault || !pickupInput.value || pickupInput.value < minimumPickup) {
      pickupInput.value = minimumPickup;
    }
  };

  const syncToppings = () => {
    const category = categorySelect.value;
    const availableToppings = getAvailableToppings(category);

    toppingList.innerHTML = availableToppings
      .map(
        (topping) => `
          <label>
            <input type="checkbox" name="toppings" value="${topping.id}" />
            <span>${topping.label} (${formatDelta(topping.price)})</span>
          </label>
        `,
      )
      .join("");
  };

  const syncIce = () => {
    const isHot = temperatureSelect.value === "HOT";
    const iceOptions = isHot ? [orderData.hotIce] : orderData.ice;

    fillSelect(
      iceSelect,
      iceOptions.map((item) => ({ value: item, label: item })),
    );
  };

  const syncDrinks = () => {
    const category = categorySelect.value;
    const drinks = orderData.drinks.filter((drink) => drink.category === category);

    fillSelect(
      drinkSelect,
      drinks.map((drink) => ({
        value: drink.name,
        label: `${drink.name} ${formatPrice(drink.price)}`,
      })),
    );
    syncToppings();
    syncTemperatures();
    updateOrderTotal();
  };

  const syncTemperatures = () => {
    const drink = orderData.drinks.find((item) => item.name === drinkSelect.value);
    const temperatures = drink?.temperatures || ["ICE"];

    fillSelect(
      temperatureSelect,
      temperatures.map((temperature) => ({ value: temperature, label: temperature })),
    );
    syncIce();
  };

  fillSelect(
    categorySelect,
    orderData.categories.map((category) => ({ value: category.id, label: category.label })),
  );
  fillSelect(
    sizeSelect,
    orderData.sizes.map((size) => ({
      value: size.id,
      label: `${size.label} (${formatDelta(size.price)})`,
    })),
  );
  fillSelect(
    sweetnessSelect,
    orderData.sweetness.map((item) => ({ value: item, label: item })),
  );
  fillSelect(
    optionSelect,
    orderData.options.map((option) => ({
      value: option.id,
      label: `${option.label} (${formatDelta(option.price)})`,
    })),
  );
  categorySelect.value = orderData.categories.some((category) => category.id === "milk")
    ? "milk"
    : orderData.categories[0]?.id || "";
  sizeSelect.value = "regular";
  syncPickupTime(true);
  window.setInterval(() => {
    syncPickupTime();
  }, 30000);
  syncDrinks();

  form.addEventListener("change", (event) => {
    if (event.target === categorySelect) {
      syncDrinks();
      return;
    }

    if (event.target === drinkSelect) {
      syncTemperatures();
    }

    if (event.target === temperatureSelect) {
      syncIce();
    }

    updateOrderTotal();
  });

  const params = new URLSearchParams(window.location.search);

  if (params.get("checkout") === "complete") {
    const pickupCode = params.get("pickupCode");
    note.textContent = pickupCode
      ? `お支払いありがとうございます。受け取り番号は ${pickupCode} です。店頭でこの番号とSquareの決済画面をご提示ください。`
      : "お支払いありがとうございます。店頭でお名前とSquareの決済画面をご提示ください。";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    syncPickupTime();
    const order = getSelectedOrder();

    note.textContent = `${order.pickup} 受け取り：${order.drink}、${order.labels.size}、${order.temperature}、${order.sweetness}、${order.ice}、合計${formatPrice(order.total)}でSquare決済を作成しています。`;
    submitButton.disabled = true;
    submitButton.textContent = "決済画面を作成中...";

    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      note.textContent =
        error.code === "SQUARE_NOT_CONFIGURED"
          ? "Square設定が未完了です。店舗側でVercelの環境変数を設定してください。"
          : "決済画面を作成できませんでした。時間をおいて再度お試しください。";
      submitButton.disabled = false;
      submitButton.textContent = "Squareで注文・支払い";
    }
  });
};

const initMenuData = async () => {
  const remoteMenu = await loadRemoteMenuData();
  const hasRemoteMenu = Boolean(remoteMenu);

  if (remoteMenu) {
    orderData = remoteMenu;
  }

  syncMenuCount();
  if (hasRemoteMenu) {
    renderHomepagePicks();
    renderMenuControls();
    renderFullMenu();
  }
  initMenuFilters();
  syncVisibleMenuCards();
  initOrderForm();
};

const initPage = async () => {
  await initMenuData();
  initTranslation();

  if (translationState.language !== "ja") {
    translatePage(translationState.language, { isRefresh: true });
  }
};

initPage();
