# Lark Base Import

Use one brand Base for shared product information:

1. `Categories` -> `categories.csv`
2. `Drinks` -> `drinks.csv`
3. `Menu Settings` -> `menu-settings.csv`

Each shop should have its own separate Lark Base with one table:

1. `Store Drinks` -> `store-drinks-template.csv`

Recommended field types:

## Categories

- `id`: text
- `label`: text
- `note`: text
- `isTapiocaFree`: checkbox
- `hasWhipByDefault`: checkbox
- `sortOrder`: number

## Drinks

- `drinkId`: stable product ID shared with every store Base
- `name`: text
- `category`: text or relation to `Categories`
- `price`: number
- `description`: text
- `temperatures`: multi-select
- `isRecommended`: checkbox
- `isFeatured`: checkbox
- `isActive`: checkbox
- `supportsDecaf`: checkbox, check only drinks that can use the decaf option
- `sortOrder`: number
- `image`: attachment field for the product photo you maintain in Lark
- `imageFile`: text helper showing the current local image path
- `imageUrl`: optional text field for a public product-image URL

After importing `Drinks`, create an attachment field named `image`.
The website reads product images in this order:

1. `image` attachment
2. `imageUrl`
3. `imageFile`

After replacing product photos in Lark, run:

```bash
npm run lark:sync-images
```

The command downloads each row's `image` attachment into `assets/menu/` using the product name as the filename, then writes that path back to `imageFile`.

## Menu Settings

- `type`: text
- `id`: text
- `label`: text
- `price`: number
- `values`: text

## Store Drinks

Create this table separately in each shop's own Base.

- `drinkId`: text, must match the brand Base `Drinks.id`
- `drinkName`: text copied from the brand Base for shop staff readability
- `category`: text copied from the brand Base for shop staff readability
- `isAvailable`: checkbox, whether the shop can sell the drink now
- `websiteEnabled`: checkbox, whether the website reservation channel can sell the drink
- `instoreEnabled`: checkbox, whether the physical shop can sell the drink
- `uberEnabled`: checkbox, whether Uber can sell the drink
- `snsEnabled`: checkbox, whether SNS sales can sell the drink
- `websitePriceOverride`: number, optional website-specific price
- `instorePriceOverride`: number, optional physical-shop-specific price
- `uberPriceOverride`: number, optional Uber-specific price
- `snsPriceOverride`: number, optional SNS-specific price
- `note`: text, optional internal shop note

After changing brand product names or categories, run:

```bash
npm run lark:sync-store-products
```

The command matches rows by `drinkId`, creates missing shop rows with `isAvailable = true`, `websiteEnabled = true`, `instoreEnabled = true`, `uberEnabled = false`, and `snsEnabled = false`, and refreshes each shop Base's `drinkName` and `category` fields.

The CSV files are generated from the current site menu by:

```bash
node scripts/export-lark-menu.js
```
