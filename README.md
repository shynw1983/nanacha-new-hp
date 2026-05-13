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

For local static preview, the page still loads through `python3 -m http.server`, but Square checkout needs the Vercel API function to run in a deployed Vercel environment.

## Sanity CMS

Sanity is the recommended CMS for menu maintenance.

Set these Vercel environment variables after creating the Sanity project:

- `SANITY_PROJECT_ID`
- `SANITY_DATASET`
- `SANITY_API_TOKEN`: optional for public datasets, recommended for private datasets

Sanity schema files are in `sanity/schemaTypes/`.

The current order form is wired to Sanity through `/api/menu`. The static full menu page remains SEO-friendly fallback content and can be made fully CMS-rendered in a later pass.

## Routes

- `/` serves `index.html`
- `/menu` serves `menu.html` through Vercel clean URLs
- `/assets/*` serves static image files with long-term cache headers
