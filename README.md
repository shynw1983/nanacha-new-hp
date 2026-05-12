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

## Routes

- `/` serves `index.html`
- `/menu` serves `menu.html` through Vercel clean URLs
- `/assets/*` serves static image files with long-term cache headers
