const header = document.querySelector("[data-header]");
const form = document.querySelector(".reserve-form");
const note = document.querySelector("[data-note]");
const languageSelect = document.querySelector("[data-language-select]");
let orderData = window.NANACHA_MENU;
let homepageData = window.NANACHA_HOMEPAGE;
let refreshLocalizedOrderLabels = () => {};
const menuCount = document.querySelector("[data-menu-count]");
const heroCarousel = document.querySelector("[data-hero-carousel]");
const LANGUAGE_STORAGE_KEY = "nanacha-language";
const HOMEPAGE_STORAGE_KEY = "nanacha-homepage";
const getStoredLanguage = () => {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY) || "ja";
  } catch (error) {
    return "ja";
  }
};
const getDictionaryStorageKey = (language) => `nanacha-dictionary-${language}`;
const getCachedHomepageData = () => {
  try {
    const cachedHomepage = localStorage.getItem(HOMEPAGE_STORAGE_KEY);
    return cachedHomepage ? JSON.parse(cachedHomepage) : null;
  } catch (error) {
    return null;
  }
};
const cacheHomepageData = (data) => {
  try {
    localStorage.setItem(HOMEPAGE_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    // Homepage data should still render when storage is unavailable.
  }
};
const translationState = {
  language: getStoredLanguage(),
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
const FORM_VALUE_LABELS = {
  sweetness: {
    ja: { ふつう: "ふつう", 多め: "多め", 少なめ: "少なめ", ゼロ: "ゼロ" },
    en: { ふつう: "Regular", 多め: "Extra Sweet", 少なめ: "Less Sweet", ゼロ: "Zero Sugar" },
    zh: { ふつう: "正常", 多め: "多甜", 少なめ: "少甜", ゼロ: "无糖" },
    ko: { ふつう: "보통", 多め: "당도 높게", 少なめ: "당도 낮게", ゼロ: "무가당" },
  },
  ice: {
    ja: { ふつう: "ふつう", 氷少なめ: "氷少なめ", 氷抜き: "氷抜き", HOTは氷なし: "HOTは氷なし" },
    en: { ふつう: "Regular Ice", 氷少なめ: "Less Ice", 氷抜き: "No Ice", HOTは氷なし: "No Ice for HOT" },
    zh: { ふつう: "正常冰", 氷少なめ: "少冰", 氷抜き: "去冰", HOTは氷なし: "热饮不加冰" },
    ko: { ふつう: "보통", 氷少なめ: "얼음 적게", 氷抜き: "얼음 없음", HOTは氷なし: "HOT은 얼음 없이" },
  },
};

const syncHeader = () => {
  header.style.boxShadow =
    window.scrollY > 12 ? "0 12px 36px rgba(0, 0, 0, 0.05)" : "none";
};

const initHeroCarousel = () => {
  if (!heroCarousel) {
    return;
  }

  const slides = Array.from(heroCarousel.querySelectorAll("[data-hero-slide]"));
  const dots = Array.from(heroCarousel.querySelectorAll("[data-hero-dot]"));
  const previousButton = heroCarousel.querySelector("[data-hero-prev]");
  const nextButton = heroCarousel.querySelector("[data-hero-next]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let activeIndex = 0;
  let autoplayTimer = null;

  const showSlide = (index) => {
    activeIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("is-active", slideIndex === activeIndex);
    });
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === activeIndex);
    });
  };

  const stopAutoplay = () => {
    window.clearInterval(autoplayTimer);
    autoplayTimer = null;
  };

  const startAutoplay = () => {
    if (prefersReducedMotion || autoplayTimer || slides.length < 2) {
      return;
    }

    autoplayTimer = window.setInterval(() => {
      showSlide(activeIndex + 1);
    }, 4800);
  };

  previousButton?.addEventListener("click", () => {
    showSlide(activeIndex - 1);
  });

  nextButton?.addEventListener("click", () => {
    showSlide(activeIndex + 1);
  });

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      showSlide(Number(dot.dataset.heroDot));
    });
  });

  heroCarousel.addEventListener("mouseenter", stopAutoplay);
  heroCarousel.addEventListener("mouseleave", startAutoplay);
  heroCarousel.addEventListener("focusin", stopAutoplay);
  heroCarousel.addEventListener("focusout", startAutoplay);

  showSlide(0);
  startAutoplay();
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
  refreshLocalizedOrderLabels();
};

const revealInitialLanguage = () => {
  document.documentElement.classList.remove("is-language-pending");
};

const revealHomepage = () => {
  document.documentElement.classList.remove("is-homepage-pending");
};

const loadDictionary = async (language) => {
  if (translationState.dictionaries[language]) {
    return translationState.dictionaries[language];
  }

  try {
    const cachedDictionary = localStorage.getItem(getDictionaryStorageKey(language));
    if (cachedDictionary) {
      const dictionary = JSON.parse(cachedDictionary);
      translationState.dictionaries[language] = dictionary;
      return dictionary;
    }
  } catch (error) {
    // Ignore malformed or unavailable cache and fetch a fresh dictionary.
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

  try {
    localStorage.setItem(getDictionaryStorageKey(language), JSON.stringify(dictionary));
  } catch (error) {
    // Translation should still work when storage is unavailable.
  }

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
  refreshLocalizedOrderLabels();
};

const translatePage = async (language, { isRefresh = false, isInitialLoad = false } = {}) => {
  if (!LANGUAGE_META[language]) {
    return;
  }

  translationState.language = language;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    // Translation can still work without persisted preference.
  }
  document.documentElement.lang = LANGUAGE_META[language].htmlLang;

  if (languageSelect) {
    languageSelect.value = language;
  }

  if (language === "ja") {
    restoreOriginalLanguage();
    if (isInitialLoad) {
      revealInitialLanguage();
    }
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
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, "ja");
      } catch (storageError) {
        // Ignore storage failures while falling back to Japanese.
      }

      if (languageSelect) {
        languageSelect.value = "ja";
      }
    }
  } finally {
    document.body.classList.remove("is-translating");

    if (isInitialLoad) {
      revealInitialLanguage();
    }

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

const getLocalizedFormValue = (group, value) =>
  FORM_VALUE_LABELS[group]?.[translationState.language]?.[value] || value;

const isTapiocaFreeCategory = (category) => orderData.tapiocaFreeCategories.includes(category);

const hasWhipByDefault = (category) => orderData.whippedCategories.includes(category);

const getAvailableToppings = (category) =>
  orderData.toppings.filter(
    (topping) =>
      !(topping.id === "no-tapioca" && isTapiocaFreeCategory(category)) &&
      !(topping.id === "no-whip" && !hasWhipByDefault(category)),
  );

const getAvailableOptions = (drink) =>
  orderData.options.filter((option) => option.id !== "decaf" || drink?.supportsDecaf);

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
    store: String(data.get("store") || ""),
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

const fillSelectIfChanged = (select, options) => {
  const currentOptions = Array.from(select.options).map((option) => ({
    value: option.value,
    label: option.textContent,
  }));
  const isUnchanged =
    currentOptions.length === options.length &&
    currentOptions.every(
      (option, index) =>
        option.value === options[index].value && option.label === options[index].label,
    );

  if (!isUnchanged) {
    fillSelect(select, options);
  }
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
  const homepageDescriptions = {
    黒糖タピオカミルク: "国産新鮮牛乳と黒糖タピオカの相性を楽しめる、不動の人気 no.1。",
    オレオタピオカフラッペ: "砕いたオレオともっちりタピオカを合わせた人気フラッペ。",
    黒糖タピオカ八女抹茶ラテ: "福岡県八女産抹茶を使った、抹茶感のあるミルクティー。",
    濃厚マンゴーヨーグルトスムージー: "マンゴーをたっぷり使用し、ヨーグルトと合わせた濃厚スムージー。",
  };

  document.querySelectorAll(".product-item, .drink-card").forEach((card) => {
    const heading = card.querySelector("h3");
    const description = card.querySelector("h3 + p");

    if (heading && description) {
      descriptions.set(heading.textContent.trim(), description.textContent.trim());
    }
  });

  Object.entries(homepageDescriptions).forEach(([name, description]) => {
    if (!descriptions.has(name)) {
      descriptions.set(name, description);
    }
  });

  return descriptions;
};

const staticDrinkDescriptions = getStaticDrinkDescriptions();

const getCategory = (categoryId) =>
  orderData?.categories.find((category) => category.id === categoryId);

const getCategoryLabel = (categoryId) => getCategory(categoryId)?.label || categoryId;

const getDrinkDescription = (drink) =>
  drink.description || staticDrinkDescriptions.get(drink.name) || "";

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
      ${getDrinkDescription(drink) ? `<p>${escapeHtml(getDrinkDescription(drink))}</p>` : ""}
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

const getCardsBySection = (section) =>
  (homepageData?.cards || []).filter((card) => card.section === section);

const renderHeroContent = () => {
  if (!homepageData?.settings) {
    return;
  }

  const { settings } = homepageData;
  const eyebrow = document.querySelector(".hero-copy .eyebrow");
  const title = document.querySelector("#hero-title");
  const description = document.querySelector(".hero-text");
  const primaryButton = document.querySelector(".hero-actions .primary-button");
  const secondaryButton = document.querySelector(".hero-actions .ghost-button");

  if (eyebrow?.lastChild) {
    eyebrow.lastChild.nodeValue = `\n            ${settings.heroEyebrow}`;
  }

  if (title?.firstChild) {
    title.firstChild.nodeValue = `\n            ${settings.heroTitle}\n            `;
  }

  if (description) description.textContent = settings.heroDescription;
  if (primaryButton) {
    primaryButton.textContent = settings.primaryButtonLabel;
    primaryButton.href = settings.primaryButtonUrl;
  }
  if (secondaryButton) {
    secondaryButton.textContent = settings.secondaryButtonLabel;
    secondaryButton.href = settings.secondaryButtonUrl;
  }
};

const renderHeroSlides = () => {
  const slidesWrap = document.querySelector(".hero-slides");
  const dotsWrap = document.querySelector(".hero-carousel-dots");

  if (!slidesWrap || !dotsWrap || !homepageData?.slides?.length) {
    return;
  }

  slidesWrap.innerHTML = homepageData.slides
    .map((slide, index) => {
      return `
        <article class="hero-slide${index === 0 ? " is-active" : ""}" data-hero-slide>
          <img src="${escapeHtml(slide.imageUrl)}" alt="${escapeHtml(slide.altText || slide.title)}" />
          <figcaption>
            <span>${escapeHtml(slide.title)}</span>
            ${escapeHtml(slide.caption)}
          </figcaption>
        </article>
      `;
    })
    .join("");

  dotsWrap.innerHTML = homepageData.slides
    .map(
      (_, index) =>
        `<button type="button" class="${index === 0 ? "is-active" : ""}" data-hero-dot="${index}" aria-label="${index + 1}枚目の画像"></button>`,
    )
    .join("");
};

const renderSimpleCards = (selector, cards, template) => {
  const container = document.querySelector(selector);
  if (container && cards.length) {
    container.innerHTML = cards.map(template).join("");
  }
};

const renderHomepageSections = () => {
  if (!homepageData) {
    return;
  }

  renderHeroContent();
  renderHeroSlides();

  renderSimpleCards(".step-grid", getCardsBySection("orderSteps"), (card) => `
    <article>
      <span>${escapeHtml(card.badge)}</span>
      <h3>${escapeHtml(card.title)}</h3>
      <p>${escapeHtml(card.body)}</p>
    </article>
  `);

  renderSimpleCards(".guide-grid", getCardsBySection("recommendGuide"), (card) => `
    <article>
      <h3>${escapeHtml(card.title)}</h3>
      <p>${escapeHtml(card.body)}</p>
    </article>
  `);

  renderSimpleCards(".season-list", getCardsBySection("seasonalPicks"), (card) => `
    <article>
      <h3>${escapeHtml(card.title)}</h3>
      <p>${escapeHtml(card.body)}</p>
    </article>
  `);

  renderSimpleCards(".story-grid", getCardsBySection("story"), (card) => `
    <article>
      <h3>${escapeHtml(card.title)}</h3>
      <p>${escapeHtml(card.body)}</p>
    </article>
  `);

  const settings = homepageData.settings || {};
  const seasonEyebrow = document.querySelector(".season-copy .eyebrow");
  const seasonTitle = document.querySelector("#season-title");
  const seasonIntro = document.querySelector(".season-copy > p:last-child");
  if (seasonEyebrow) seasonEyebrow.textContent = settings.seasonEyebrow;
  if (seasonTitle?.firstChild) seasonTitle.firstChild.nodeValue = `\n            ${settings.seasonTitle}\n            `;
  if (seasonIntro) seasonIntro.textContent = settings.seasonIntro;

  renderSimpleCards(".store-list", homepageData.stores || [], (store) => `
    <article class="store-card ${store.id === "next-store" ? "is-upcoming" : ""}">
      <p class="store-status">${escapeHtml(store.statusLabel)}</p>
      <h3>${escapeHtml(store.name)}</h3>
      <p>${escapeHtml(store.summary)}</p>
      ${
        store.address
          ? `<a class="text-link" href="#access">店舗情報を見る</a>`
          : ""
      }
    </article>
  `);

  const primaryStore = homepageData.stores?.find((store) => store.address);
  if (primaryStore) {
    const accessTitle = document.querySelector("#access-title");
    const address = document.querySelector(".access-copy address");
    const intro = document.querySelector(".access-copy > p:not(.eyebrow)");
    const infoValues = document.querySelectorAll(".shop-info dd");
    const mapLink = document.querySelector(".access-actions .primary-button");
    const mapFrame = document.querySelector(".map-card iframe");
    if (accessTitle?.firstChild) accessTitle.firstChild.nodeValue = `\n            ${primaryStore.name}\n            `;
    if (address) address.textContent = `${primaryStore.postalCode} ${primaryStore.address}`.trim();
    if (intro) intro.textContent = primaryStore.intro;
    [primaryStore.hours, primaryStore.closedDays, primaryStore.nearestStation, primaryStore.usage, primaryStore.paymentNote].forEach(
      (value, index) => {
        if (infoValues[index]) infoValues[index].textContent = value;
      },
    );
    if (mapLink) mapLink.href = primaryStore.googleMapsUrl;
    if (mapFrame) mapFrame.src = primaryStore.googleMapsEmbedUrl;
  }

  renderSimpleCards(".faq-grid", homepageData.faqs || [], (faq) => `
    <details>
      <summary>${escapeHtml(faq.question)}</summary>
      <p>${escapeHtml(faq.answer)}</p>
    </details>
  `);

  const footerLines = document.querySelectorAll("footer p");
  if (footerLines[0]) footerLines[0].textContent = settings.footerTextLeft;
  if (footerLines[1]) footerLines[1].textContent = settings.footerTextRight;
  revealHomepage();
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

const loadRemoteMenuData = async (store = "") => {
  if (window.location.protocol === "file:") {
    return null;
  }

  try {
    const url = new URL("/api/menu", window.location.origin);

    if (store) {
      url.searchParams.set("store", store);
    }

    const response = await fetch(url, {
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

const loadRemoteHomepageData = async () => {
  try {
    const response = await fetch("/api/homepage", {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    cacheHomepageData(data);
    return data;
  } catch {
    return null;
  }
};

const initOrderForm = () => {
  if (!form || !note || !orderData) {
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  const storeSelect = form.querySelector("[data-store-select]");
  const categorySelect = form.querySelector("[data-category-select]");
  const drinkSelect = form.querySelector("[data-drink-select]");
  const sizeSelect = form.querySelector("[data-size-select]");
  const temperatureSelect = form.querySelector("[data-temperature-select]");
  const sweetnessSelect = form.querySelector("[data-sweetness-select]");
  const iceSelect = form.querySelector("[data-ice-select]");
  const optionSelect = form.querySelector("[data-option-select]");
  const pickupInput = form.querySelector("input[name='pickup']");
  const toppingList = form.querySelector("[data-topping-list]");
  const syncStores = () => {
    const stores = orderData.stores?.length ? orderData.stores : [{ id: "kiyokawa", label: "福岡清川店" }];

    fillSelect(
      storeSelect,
      stores.map((store) => ({ value: store.id, label: store.label })),
    );
  };

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

    fillSelectIfChanged(
      iceSelect,
      iceOptions.map((item) => ({ value: item, label: getLocalizedFormValue("ice", item) })),
    );
  };

  const syncOptions = () => {
    const drink = orderData.drinks.find((item) => item.name === drinkSelect.value);
    const previousOption = optionSelect.value;
    const availableOptions = getAvailableOptions(drink);

    fillSelect(
      optionSelect,
      availableOptions.map((option) => ({
        value: option.id,
        label: `${option.label} (${formatDelta(option.price)})`,
      })),
    );

    optionSelect.value = availableOptions.some((option) => option.id === previousOption)
      ? previousOption
      : "none";
  };

  const syncLocalizedLabels = () => {
    const currentSweetness = sweetnessSelect.value;
    const currentIce = iceSelect.value;

    fillSelectIfChanged(
      sweetnessSelect,
      orderData.sweetness.map((item) => ({
        value: item,
        label: getLocalizedFormValue("sweetness", item),
      })),
    );
    sweetnessSelect.value = currentSweetness || orderData.sweetness[0] || "";
    syncIce();
    iceSelect.value = Array.from(iceSelect.options).some((option) => option.value === currentIce)
      ? currentIce
      : iceSelect.value;
  };

  const syncDrinks = () => {
    const category = categorySelect.value;
    const drinks = orderData.drinks.filter(
      (drink) => drink.category === category && drink.isAvailable !== false && drink.websiteEnabled !== false,
    );

    fillSelect(
      drinkSelect,
      drinks.map((drink) => ({
        value: drink.name,
        label: `${drink.name} ${formatPrice(drink.price)}`,
      })),
    );
    syncToppings();
    syncTemperatures();
    syncOptions();
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

  syncStores();
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
  categorySelect.value = orderData.categories.some((category) => category.id === "milk")
    ? "milk"
    : orderData.categories[0]?.id || "";
  sizeSelect.value = "regular";
  syncPickupTime(true);
  window.setInterval(() => {
    syncPickupTime();
  }, 30000);
  refreshLocalizedOrderLabels = syncLocalizedLabels;
  syncLocalizedLabels();
  syncDrinks();

  form.addEventListener("change", (event) => {
    if (event.target === storeSelect) {
      initMenuData(storeSelect.value);
      return;
    }
    if (event.target === categorySelect) {
      syncDrinks();
      return;
    }

    if (event.target === drinkSelect) {
      syncTemperatures();
      syncOptions();
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

const initMenuData = async (store = "") => {
  let remoteMenu = await loadRemoteMenuData(store);

  if (!store && remoteMenu?.stores?.length) {
    const defaultStore = remoteMenu.stores[0].id;
    remoteMenu = (await loadRemoteMenuData(defaultStore)) || remoteMenu;
  }

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
  initTranslation();

  const initialTranslation =
    translationState.language !== "ja"
      ? translatePage(translationState.language, { isRefresh: true, isInitialLoad: true })
      : Promise.resolve().then(revealInitialLanguage);

  const cachedHomepageData = getCachedHomepageData();
  if (cachedHomepageData) {
    homepageData = cachedHomepageData;
    renderHomepageSections();
  }

  homepageData = (await loadRemoteHomepageData()) || homepageData;
  renderHomepageSections();
  await initMenuData();
  initHeroCarousel();
  await initialTranslation;
};

initPage();
