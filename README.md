# nanacha Kiyokawa Website

Next.js website for nanacha Fukuoka Kiyokawa.

## Stack

- Next.js App Router
- React
- Vercel Route Handlers
- Lark Base as CMS source when configured
- Square Checkout for pickup orders
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
- `/api/homepage`
- `/api/menu`
- `/api/create-checkout`
- `/api/menu-image`
- `/api/lark-image`

## Project Structure

```text
app/                  Next.js routes and route handlers
components/           React UI components
api/                  Shared server-side data/business modules
data/                 Local fallback descriptions and category notes
public/assets/        Static images
public/locales/       Translation dictionaries
scripts/              Maintenance scripts for i18n and Lark sync
```

## Data Sources

Menu data is served through `/api/menu`.

- When Lark is configured, Lark is the source of truth.
- If Lark is unavailable, the site falls back to `menu-data.js` plus local metadata in `data/`.

Homepage data is served through `/api/homepage`.

- When the homepage Lark tables are configured, Lark is the source of truth.
- Otherwise the site falls back to `homepage-data.js`.

## Square Checkout

The pickup form creates a Square-hosted checkout link through `/api/create-checkout`.

Required environment variables:

- `SQUARE_ACCESS_TOKEN`
- `SQUARE_LOCATION_ID`
- `SQUARE_ENVIRONMENT`: `production` or `sandbox`

The browser never receives the Square access token. Prices and customizations are validated on the server before checkout is created.

## Lark CMS

Shared menu Base tables:

- `Categories`
- `Drinks`
- `Menu Settings`

Homepage Base tables:

- `Homepage Settings`
- `Homepage Slides`
- `Homepage Cards`
- `Stores`
- `FAQ`

Optional shop-specific Base table:

- `Store Drinks`

Required Lark environment variables are unchanged from the previous setup:

```text
LARK_APP_ID
LARK_APP_SECRET
LARK_BASE_APP_TOKEN
LARK_CATEGORIES_TABLE_ID
LARK_DRINKS_TABLE_ID
LARK_MENU_SETTINGS_TABLE_ID
LARK_HOMEPAGE_BASE_APP_TOKEN
LARK_HOMEPAGE_SETTINGS_TABLE_ID
LARK_HOMEPAGE_SLIDES_TABLE_ID
LARK_HOMEPAGE_CARDS_TABLE_ID
LARK_STORES_TABLE_ID
LARK_FAQ_TABLE_ID
LARK_STORES_JSON
```

Useful maintenance commands:

```bash
npm run lark:export-menu
npm run lark:sync-homepage-settings
npm run lark:sync-images
npm run lark:sync-store-products
```

## Translation Updates

The site renders Japanese by default. The React UI reads translated labels from:

- `public/locales/en.json`
- `public/locales/zh.json`
- `public/locales/ko.json`

After changing visible text, run:

```bash
npm run i18n:update
```

This refreshes the source dictionary and fills missing translations with OpenAI when `OPENAI_API_KEY` is available.

## Deployment

Deploy as a standard Next.js project on Vercel.

Recommended settings:

- Framework Preset: `Next.js`
- Build Command: default
- Output Directory: default
- Install Command: default

`vercel.json` keeps long-term cache headers for `/assets/*`.
