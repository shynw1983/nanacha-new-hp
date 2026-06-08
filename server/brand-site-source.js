const osBaseUrl =
  process.env.FOUNDR1_OS_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_FOUNDR1_OS_PUBLIC_BASE_URL ||
  "https://foundr1.jp";

const normalizeUrl = (url = "") => String(url || "").replace(/\/$/, "");

const localizeSection = (section, language = "ja") => {
  if (!section || language === "ja") return section;
  const tagDisplayNames = section.tagDisplayNames || {};
  return {
    ...section,
    title: section.titleDisplayNames?.[language] || section.title,
    subtitle: section.subtitleDisplayNames?.[language] || section.subtitle,
    body: section.bodyDisplayNames?.[language] || section.body,
    actionLabel: section.actionLabelDisplayNames?.[language] || section.actionLabel,
    tags: Array.isArray(section.tags)
      ? section.tags.map((tag, index) => tagDisplayNames[index]?.[language] || tag)
      : section.tags,
  };
};

async function getBrandSiteSections(brand = "nanacha", language = "ja") {
  const baseUrl = normalizeUrl(osBaseUrl);
  if (!baseUrl) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch(`${baseUrl}/api/public/brand-sites?brand=${encodeURIComponent(brand)}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return [];
    const body = await response.json();
    const sections = Array.isArray(body.sections) ? body.sections : [];
    return sections.map((section) => localizeSection(section, language));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function byKey(sections = []) {
  return new Map(sections.map((section) => [section.sectionKey, section]));
}

function mergeNanachaHomepage(homepage, sections = []) {
  if (!sections.length) return homepage;
  const sectionByKey = byKey(sections);
  const hero = sectionByKey.get("hero");
  const shops = sectionByKey.get("shops");

  return {
    ...homepage,
    settings: {
      ...homepage.settings,
      ...(hero
        ? {
            heroEyebrow: hero.subtitle || homepage.settings.heroEyebrow,
            heroTitle: hero.title || homepage.settings.heroTitle,
            heroDescription: hero.body || homepage.settings.heroDescription,
            primaryButtonLabel: hero.actionLabel || homepage.settings.primaryButtonLabel,
            primaryButtonUrl: hero.actionUrl || homepage.settings.primaryButtonUrl,
          }
        : {}),
    },
    slides: homepage.slides.map((slide) => {
      const section = sectionByKey.get(
        slide.id === "hero-01" ? "hero-slide-signature" : slide.id === "hero-02" ? "hero-slide-tapioca" : "",
      );
      if (!section) return slide;
      return {
        ...slide,
        title: section.title || slide.title,
        caption: section.body || slide.caption,
        imageUrl: section.imageUrl || slide.imageUrl,
        altText: section.imageAlt || slide.altText,
      };
    }),
    stores: shops
      ? homepage.stores.map((store) =>
          store.isPrimary
            ? {
                ...store,
                summary: shops.body || store.summary,
                storefrontImageUrl: shops.imageUrl || store.storefrontImageUrl,
                storefrontImageAlt: shops.imageAlt || store.storefrontImageAlt,
              }
            : store,
        )
      : homepage.stores,
  };
}

module.exports = {
  getBrandSiteSections,
  mergeNanachaHomepage,
};
