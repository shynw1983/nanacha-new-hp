# nanacha Kiyokawa Website

Static website for nanacha Fukuoka Kiyokawa.

## Local Preview

```bash
npm run dev
```

Or, without npm:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

You can also open `index.html` directly in a browser because the site has no build step.

## Deploy To Vercel

This project is ready to deploy as a static Vercel site.

Recommended Vercel project settings:

- Framework Preset: `Other`
- Build Command: `npm run build`
- Output Directory: leave empty / default
- Install Command: leave default

The root files `index.html`, `menu.html`, `styles.css`, `script.js`, and `assets/` are served directly.

## Square Checkout

The pickup form creates a Square-hosted checkout link through `/api/create-checkout`.

Set these Vercel environment variables before using live checkout:

- `SQUARE_ACCESS_TOKEN`
- `SQUARE_LOCATION_ID`
- `SQUARE_ENVIRONMENT`: `production` or `sandbox`

The browser never receives the Square access token. Drink prices and customization prices are validated on the server before Square checkout is created.

Menu/order data is loaded through `/api/menu`. When Lark is configured, `/api/menu` reads menu records from Lark Base. If Lark is not configured or temporarily unavailable, it falls back to `menu-data.js`.

The browser and Square checkout validation both use the same menu source, so visible drink prices and checkout prices stay aligned.
When Lark returns a product image URL, the homepage picks and static menu cards update their images in the browser by matching the drink name.

For local static preview, the page still loads through `python3 -m http.server`, but Square checkout needs the Vercel API function to run in a deployed Vercel environment.

## Translation Updates

The website shows Japanese by default. English, Chinese, and Korean are loaded from static files in `locales/`.

- `locales/ja.json`: Japanese source text
- `locales/en.json`: English translations
- `locales/zh.json`: Chinese translations
- `locales/ko.json`: Korean translations

The live website does not call OpenAI. OpenAI is used only when we update the translation files.

### One-time setup

Create a local file named `.env.local` in the project root:

```bash
OPENAI_API_KEY=your_openai_key
```

Do not upload this file. It is already ignored by `.gitignore`.

### Normal update flow

After changing website text in `index.html`, `menu.html`, or `menu-data.js`, run:

```bash
npm run i18n:update
```

This command finds new website text and asks OpenAI to fill only the missing translations.

The script does not overwrite existing translations. It only translates empty values.

After that, check these files:

```text
locales/en.json
locales/zh.json
locales/ko.json
```

If the translations look good, build and deploy the site.

### If npm is not available

Run the same steps with Node:

```bash
node scripts/i18n.js extract
node scripts/i18n.js translate:openai
```

### Cost control

To test with only English first:

```bash
npm run i18n:update:en
```

To change the OpenAI model or batch size:

```bash
OPENAI_TRANSLATION_MODEL=gpt-4.1-mini \
OPENAI_TRANSLATION_BATCH_SIZE=50 \
npm run i18n:update
```

## Lark Base Menu CMS

Lark Base is the source of truth for menu maintenance. The site reads menu data through `/api/menu` and uses it for:

- full menu page rendering
- homepage recommended drinks
- pickup reservation form
- Square checkout price validation
- product names, prices, photos, descriptions, temperatures, categories, sizes, sweetness, ice, options, and toppings

The static HTML menu remains only as a fallback for local/offline preview. When Lark is configured, Lark data replaces the visible menu in the browser.

Use one shared menu Base for product information:

- `Categories`
- `Drinks`
- `Menu Settings`

Use one separate homepage Base for website-maintained content when menu staff and website staff are different:

- `Homepage Settings`
- `Homepage Slides`
- `Homepage Cards`
- `Stores`
- `FAQ`

For multiple shops, create one separate shop Base per location. Each shop Base contains:

- `Store Drinks`

The shop Base stores shop-specific availability, per-channel selling flags, optional per-channel price overrides, and internal notes. It also keeps copied `drinkName` and `category` columns so shop staff do not need to work from IDs alone. Product names, descriptions, photos, categories, and default prices still stay canonical in the shared brand Base.

Generate the CSV files again whenever needed:

```bash
npm run lark:export-menu
```

Set these environment variables in Vercel and in local `.env.local` when needed:

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
```

For shop-specific availability, set `LARK_STORES_JSON` in Vercel and local `.env.local`:

```json
[
  {
    "id": "kiyokawa",
    "label": "福岡清川店",
    "appToken": "shop_base_app_token",
    "storeDrinksTableId": "shop_store_drinks_table_id"
  }
]
```

The reservation form reads shop availability from the selected shop Base. A drink only appears for website reservation when that shop has a matching `drinkId` row with both `isAvailable = true` and `websiteEnabled = true`. Website checkout uses `websitePriceOverride` when present, otherwise the shared brand price.

After changing a product name or category in the brand Base, sync the readable columns in each shop Base:

```bash
npm run lark:sync-store-products
```

The command matches rows by `drinkId`, creates missing shop rows with `isAvailable = true`, `websiteEnabled = true`, `instoreEnabled = true`, `uberEnabled = false`, and `snsEnabled = false`, and refreshes only `drinkName` and `category` on existing rows, leaving shop selling flags and price overrides untouched.

The `Drinks` table can use:

- `supportsDecaf` to decide whether the `デカフェ` option appears for a drink
- `image` for a Lark attachment field containing the product photo
- `imageUrl` for a public image URL
- `imageFile` for an existing site asset path such as `assets/menu/drink-01.png`

The site reads images in this order: `image`, then `imageUrl`, then `imageFile`. Images uploaded to the Lark `image` attachment field are served through `/api/menu-image` so the browser can display files that require Lark API authorization. Because attachment image URLs include Lark's revision value, `/api/menu-image` can be cached for a long time and naturally refreshes when the attachment changes.

Homepage content is loaded through `/api/homepage`. When the homepage Base is configured, Lark becomes the source of truth for:

- hero copy and CTA labels
- homepage carousel slides
- order-guide cards
- drink-guide cards
- seasonal picks
- brand story cards
- shop cards and access details
- FAQ entries
- footer text

If the homepage tables are missing or empty, the site falls back to `homepage-data.js` so the homepage still renders during local preview or partial setup.

To copy uploaded Lark product photos into the site's own static assets, run:

```bash
npm run lark:sync-images
```

The sync command downloads each drink's `image` attachment into `assets/menu/` using the product name as the filename, then writes that path back to the row's `imageFile` field. After syncing and deploying, the website can serve those photos directly as static files.

When changing menu text in Lark, run the translation update flow again so `locales/en.json`, `locales/zh.json`, and `locales/ko.json` can pick up new product names and descriptions.

## Routes

- `/` serves `index.html`
- `/menu` serves `menu.html` through Vercel clean URLs
- `/assets/*` serves static image files with long-term cache headers
