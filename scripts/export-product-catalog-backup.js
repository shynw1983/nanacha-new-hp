const fs = require("fs");
const path = require("path");
const { listProductCatalogForAdmin } = require("../server/product-catalog");

const root = path.join(__dirname, "..");
const outputDir = path.join(root, "lark-import");

const escapeCsv = (value = "") => {
  const text = Array.isArray(value) ? value.join(",") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const writeCsv = (fileName, rows) => {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, fileName), `${rows.map((row) => row.map(escapeCsv).join(",")).join("\n")}\n`);
};

const main = async () => {
  const catalog = await listProductCatalogForAdmin();

  writeCsv("product-categories-backup.csv", [
    ["id", "label", "note", "isTapiocaFree", "hasWhipByDefault", "sortOrder", "isActive"],
    ...catalog.categories.map((category) => [
      category.id,
      category.label,
      category.note,
      category.isTapiocaFree,
      category.hasWhipByDefault,
      category.sortOrder,
      category.isActive,
    ]),
  ]);

  writeCsv("products-backup.csv", [
    [
      "drinkId",
      "name",
      "category",
      "price",
      "description",
      "imageUrl",
      "temperatures",
      "isRecommended",
      "isFeatured",
      "isActive",
      "allowedSizes",
      "allowedSweetness",
      "allowedIce",
      "allowedOptions",
      "allowedToppings",
      "sortOrder",
    ],
    ...catalog.products.map((product) => [
      product.drinkId,
      product.name,
      product.category,
      product.price,
      product.description,
      product.imageUrl,
      product.temperatures,
      product.isRecommended,
      product.isFeatured,
      product.isActive,
      product.allowedSizes,
      product.allowedSweetness,
      product.allowedIce,
      product.allowedOptions,
      product.allowedToppings,
      product.sortOrder,
    ]),
  ]);

  console.log(`Exported product catalog backup CSV files to ${path.relative(root, outputDir)}/`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
