# nanacha Kiyokawa Website

Next.js website for nanacha Fukuoka Kiyokawa.

## Stack

- Next.js App Router
- React
- Vercel Route Handlers
- Lark Base for homepage content when publishing snapshots
- Foundr1 OS for menu, store availability, checkout, orders, staff, reports, and payments
- Static locale dictionaries in `public/locales/`

## Local Development

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Main Routes

- `/` homepage
- `/menu` full menu
- `/shops` store list
- `/shops/[slug]` store detail
- `/api/homepage`
- `/api/menu`
- `/api/create-checkout`
- `/api/menu-image`
- `/api/lark-image`

The old local admin routes under `/admin/*` redirect to Foundr1 OS.

## Data Sources

Homepage content and fallback menu content are served from published snapshots:

- `published/homepage.json`
- `published/menu.json`

The live menu is fetched from Foundr1 OS via `FOUNDR1_OS_MENU_API_URL`. If that API is unavailable, the site falls back to the published menu snapshot.

Checkout and order status are proxied to Foundr1 OS:

- `FOUNDR1_OS_CHECKOUT_API_URL`
- `FOUNDR1_OS_ORDER_STATUS_API_URL`
- `FOUNDR1_OS_ORDER_REALTIME_API_URL`

## Lark CMS

Lark is still used for homepage publishing:

- `Homepage Settings`
- `Homepage Slides`
- `Homepage Cards`
- `Stores`
- `FAQ`

Required Lark environment variables:

```text
LARK_APP_ID
LARK_APP_SECRET
LARK_HOMEPAGE_BASE_APP_TOKEN
LARK_HOMEPAGE_SETTINGS_TABLE_ID
LARK_HOMEPAGE_SLIDES_TABLE_ID
LARK_HOMEPAGE_CARDS_TABLE_ID
LARK_STORES_TABLE_ID
LARK_FAQ_TABLE_ID
```

Useful maintenance commands:

```bash
npm run publish
npm run lark:publish
npm run lark:sync-homepage-settings
npm run lark:sync-homepage-images
npm run i18n:update
```

`npm run publish` runs:

1. Sync Lark homepage images into local static assets.
2. Publish homepage and menu snapshots.
3. Update translation dictionaries.
4. Build the site.

## Translation Updates

The site renders Japanese by default. The React UI reads translated labels from:

- `public/locales/en.json`
- `public/locales/zh.json`
- `public/locales/ko.json`

After changing visible text, run:

```bash
npm run i18n:update
```

## Deployment

Deploy as a standard Next.js project on Vercel.

`vercel.json` keeps long-term cache headers for `/assets/*`.
