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

Menu/order data is loaded through `/api/menu`. When Sanity is configured, `/api/menu` reads active drink items from Sanity. If Sanity is not configured or temporarily unavailable, it falls back to `menu-data.js`.

The browser and Square checkout validation both use the same menu source, so visible drink prices and checkout prices stay aligned.
When Sanity returns a product image URL, the homepage picks and static menu cards update their images in the browser by matching the drink name.

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

## Sanity CMS

Sanity is the recommended CMS for menu maintenance.

Set these Vercel environment variables after creating the Sanity project:

- `SANITY_PROJECT_ID`
- `SANITY_DATASET`
- `SANITY_API_TOKEN`: optional for public datasets, recommended for private datasets
- `SANITY_STUDIO_PROJECT_ID`: same value as `SANITY_PROJECT_ID`
- `SANITY_STUDIO_DATASET`: same value as `SANITY_DATASET`

`SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET` must be available during the Vercel build. If either is missing, the `/admin` Studio build fails instead of deploying a blank page.

Sanity Studio is built to `/admin` during the Vercel build. After deployment, open:

```text
https://your-domain/admin
```

In Sanity Manage, add the deployed site origin to CORS:

```text
https://your-domain
```

For local Studio development, also add:

```text
http://localhost:3333
http://localhost:8000
```

Sanity schema files are in `sanity/schemaTypes/`.

The current order form is wired to Sanity through `/api/menu`. The static full menu page remains SEO-friendly fallback content and can be made fully CMS-rendered in a later pass.

### Local Studio

After installing dependencies, run:

```bash
SANITY_STUDIO_PROJECT_ID=your_project_id \
SANITY_STUDIO_DATASET=production \
npm run sanity:dev
```

Then open the local Studio URL shown by Sanity.

### Import Existing Menu

Use a Sanity token with write permissions, then run:

```bash
SANITY_PROJECT_ID=your_project_id \
SANITY_DATASET=production \
SANITY_API_TOKEN=your_write_token \
node scripts/import-sanity-menu.js
```

Or with npm:

```bash
SANITY_PROJECT_ID=your_project_id \
SANITY_DATASET=production \
SANITY_API_TOKEN=your_write_token \
npm run sanity:import-menu
```

The import creates or replaces:

- 8 `category` documents
- All drinks from `menu-data.js`
- Product images for drinks that have local files in `assets/menu/drink-01.png` through `assets/menu/drink-42.png`

Drink document IDs are generated from category + drink name, so rerunning the import updates the same documents instead of creating duplicates.
Existing product images in Sanity are left untouched, so photos changed manually in Studio are not overwritten by the importer.

## Routes

- `/` serves `index.html`
- `/menu` serves `menu.html` through Vercel clean URLs
- `/assets/*` serves static image files with long-term cache headers
