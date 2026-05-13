# Sanity Menu Setup

This folder contains the recommended Sanity schemas for nanacha menu management.

## Content Types

- `category`: menu category IDs used by the website and order form.
- `drink`: orderable drink items with name, price, category, temperatures, status, and sorting.

Keep category `id` values aligned with the website:

```text
frappe
milk
smoothie
cheese-tea
tea
special
coffee
tea-coffee
```

## Vercel Environment Variables

Set these in Vercel after creating the Sanity project:

```text
SANITY_PROJECT_ID
SANITY_DATASET
SANITY_API_TOKEN
```

`SANITY_API_TOKEN` is optional for public datasets, but recommended if the dataset is private.

## Runtime Behavior

The site requests `/api/menu`.

- If Sanity is configured, `/api/menu` reads active `drink` documents from Sanity.
- If Sanity is not configured or temporarily fails, the site falls back to `menu-data.js`.
- Square checkout validation uses the same menu source, so order prices stay aligned with the visible order form.

The static `menu.html` content still works as SEO-friendly fallback content. The pickup order form is the first surface wired to Sanity.
