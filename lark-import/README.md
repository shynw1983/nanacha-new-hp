# Lark Homepage Import

Foundr1 OS now owns brand menus, store availability, checkout, orders, staff, and reports.

This folder only keeps CSV templates for website-maintained homepage content:

1. `Homepage Settings` -> `homepage-settings.csv`
2. `Homepage Slides` -> `homepage-slides.csv`
3. `Homepage Cards` -> `homepage-cards.csv`
4. `Stores` -> `stores.csv`
5. `FAQ` -> `faq.csv`

## Homepage Settings

- `key`: text
- `heroEyebrow`: text
- `heroTitle`: text
- `heroDescription`: text
- `primaryButtonLabel`: text
- `primaryButtonUrl`: text
- `secondaryButtonLabel`: text
- `secondaryButtonUrl`: text
- `seasonEyebrow`: text
- `seasonTitle`: text
- `seasonIntro`: text
- `footerTextLeft`: text
- `footerTextRight`: text
- `isActive`: checkbox

## Homepage Slides

- `slideId`: text
- `title`: text
- `caption`: text
- `altText`: text
- `variant`: single select; use `photo` for homepage photography
- `sortOrder`: number
- `isActive`: checkbox
- `image`: attachment field for the homepage photo
- `imageFile`: text helper showing the current local image path
- `imageUrl`: optional public image URL
- `linkUrl`: optional text URL

The website reads homepage slide images in this order:

1. `imageFile`
2. `imageUrl`
3. `image` attachment

Use `imageFile` for published production images so the live site does not depend on Lark attachments at runtime.

## Homepage Cards

- `cardId`: text
- `section`: single select (`orderSteps`, `recommendGuide`, `seasonalPicks`, `story`)
- `badge`: text, optional
- `title`: text
- `body`: text
- `linkedDrinkId`: text, optional
- `sortOrder`: number
- `isActive`: checkbox

## Stores

- `storeId`: text
- `statusLabel`: text
- `name`: text
- `summary`: text
- `postalCode`: text
- `addressRegion`: text
- `addressLocality`: text
- `streetAddress`: text
- `address`: text
- `intro`: text
- `hours`: text
- `openingHoursSchema`: text, JSON array for structured data
- `closedDays`: text
- `nearestStation`: text
- `usage`: text
- `paymentNote`: text
- `googleMapsUrl`: text
- `googleMapsEmbedUrl`: text
- `uberEatsUrl`: text, optional store-specific delivery link
- `phone`: text, optional
- `isPrimary`: checkbox
- `sortOrder`: number
- `isActive`: checkbox

## FAQ

- `faqId`: text
- `question`: text
- `answer`: text
- `sortOrder`: number
- `isActive`: checkbox
