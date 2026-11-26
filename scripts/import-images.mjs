// Converts your product photos into the shop's web images.
// Usage: npm run images:import -- /path/to/photos
// Name each file after its product, for example bonfortis-k2.jpg
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, basename } from "node:path";
import sharp from "sharp";

const folder = process.argv[2];
if (!folder) throw new Error("Pass the folder that holds the new photos.");

const catalog = JSON.parse(readFileSync("catalog/catalog.json", "utf8"));
const slugs = new Set(catalog.products.map((p) => p.slug));
const accepted = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]);
const done = new Set();
const problems = [];

for (const file of readdirSync(folder).sort()) {
  const extension = extname(file).toLowerCase();
  if (!accepted.has(extension)) continue;
  const slug = basename(file, extname(file)).toLowerCase();
  if (!slugs.has(slug)) {
    problems.push(`${file}: no product has the name "${slug}"`);
    continue;
  }
  if (done.has(slug)) {
    problems.push(`${file}: a second photo for "${slug}" was skipped`);
    continue;
  }
  const path = join(folder, file);
  const { width = 0, height = 0 } = await sharp(path).metadata();
  if (Math.min(width, height) < 1600) {
    problems.push(`${file}: ${width}x${height} is below 1600 px on the short side; not imported`);
    continue;
  }
  // rotate() applies camera orientation; metadata (including location) is not copied.
  await sharp(path)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(`public/products/${slug}.webp`);
  done.add(slug);
}

console.log(`Imported ${done.size} of ${slugs.size} product photos.`);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
