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
- `image`: attachment field for the product photo you maintain in Lark
- `imageFile`: text helper showing the current local image path
- `imageUrl`: optional text field for a public product-image URL

After importing `Drinks`, create an attachment field named `image`.
The website reads product images in this order:

1. `image` attachment
2. `imageUrl`
3. `imageFile`

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
