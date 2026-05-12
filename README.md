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

The browser never receives the Square access token. Drink prices are validated in `api/create-checkout.js`.

For local static preview, the page still loads through `python3 -m http.server`, but Square checkout needs the Vercel API function to run in a deployed Vercel environment.

## Routes

- `/` serves `index.html`
- `/menu` serves `menu.html` through Vercel clean URLs
- `/assets/*` serves static image files with long-term cache headers
