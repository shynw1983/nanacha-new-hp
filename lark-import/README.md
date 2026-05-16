# Lark Base Import

Import these CSV files into three Lark Base tables:

1. `Categories` -> `categories.csv`
2. `Drinks` -> `drinks.csv`
3. `Menu Settings` -> `menu-settings.csv`

Recommended field types:

## Categories

- `id`: text
- `label`: text
- `note`: text
- `isTapiocaFree`: checkbox
- `hasWhipByDefault`: checkbox
- `sortOrder`: number

## Drinks

- `name`: text
- `category`: text or relation to `Categories`
- `price`: number
- `description`: text
- `temperatures`: multi-select
- `isRecommended`: checkbox
- `isFeatured`: checkbox
- `isActive`: checkbox
- `sortOrder`: number
- `imageFile`: text helper showing the current local image path
- `imageUrl`: text field used by the website for the public product-image URL

After importing `Drinks`, upload the product photos into an attachment field such as `image`.
For the current website integration, also fill `imageUrl` with a public image URL for each product.

## Menu Settings

- `type`: text
- `id`: text
- `label`: text
- `price`: number
- `values`: text

The CSV files are generated from the current site menu by:

```bash
node scripts/export-lark-menu.js
```
