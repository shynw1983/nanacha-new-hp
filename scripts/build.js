const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "public");
const files = ["index.html", "menu.html", "styles.css", "script.js", "menu-data.js", "assets"];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const file of files) {
  const source = path.join(root, file);
  const target = path.join(output, file);

  if (!fs.existsSync(source)) {
    throw new Error(`Missing build input: ${file}`);
  }

  fs.cpSync(source, target, { recursive: true });
}

console.log(`Built static site to ${path.relative(root, output)}/`);
