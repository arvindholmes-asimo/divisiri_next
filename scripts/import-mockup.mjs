// Extracts the public catalogue and product images from the bundled design mockup.
// Usage: node scripts/import-mockup.mjs "/path/to/Divisiri Website.html"
//
// The mockup also embeds internal notes. Only the fields named here are copied.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const source = process.argv[2];
if (!source) throw new Error("Pass the path to the mockup HTML file.");
const html = readFileSync(source, "utf8");

function block(kind) {
  const match = html.match(new RegExp(`<script type="__bundler/${kind}">([\\s\\S]*?)</script>`));
  if (!match) throw new Error(`The file has no ${kind} block.`);
  return JSON.parse(match[1]);
}

const manifest = block("manifest");
function bytes(id) {
  const asset = manifest[id];
  const data = Buffer.from(asset.data, "base64");
  return asset.compressed ? gunzipSync(data) : data;
}

const dataId = Object.keys(manifest).find((id) => manifest[id].mime === "application/json");
const data = JSON.parse(bytes(dataId).toString("utf8"));
const resources = new Map(block("ext_resources").map((item) => [item.id, item.uuid]));

const slugOf = new Map(data.products.map((p) => [p.slug, p]));
const concerns = data.concerns.map(([name, slug, productSlugs], position) => {
  for (const product of productSlugs) {
    if (!slugOf.has(product)) throw new Error(`${slug} lists unknown product ${product}`);
  }
  return { slug, name, position, products: productSlugs };
});

const products = data.products.map((p, position) => ({
  slug: p.slug,
  position,
  name: p.display,
  tagline: p.tagline,
  format: p.format,
  pack: p.pack,
  category: p.category,
  type: p.type,
  composition: p.composition.map(([name, amount, rda]) => ({ name, amount, rda: rda ?? "" })),
  ingredients: p.ingredients,
  benefits: p.benefits,
  packClaims: p.pack_claims,
  dosage: p.dosage,
  precautions: p.precautions,
}));

const company = {
  name: data.common.company,
  manufacturer: data.common.manufacturer,
  shelfLife: data.common.shelf_life,
  rdaBasis: data.common.rda_basis,
  disclaimer: data.common.disclaimer,
};

mkdirSync("catalog", { recursive: true });
writeFileSync("catalog/catalog.json", JSON.stringify({ company, concerns, products }, null, 2) + "\n");

// Placeholder photography, replaced later with `npm run images:import`.
mkdirSync("public/products", { recursive: true });
const missing = [];
for (const { slug } of products) {
  const id = resources.get(`img_${slug}_800x1200`);
  if (id) writeFileSync(`public/products/${slug}.webp`, bytes(id));
  else missing.push(slug);
}

const notes = data.products.map((p) => `| ${p.display} | ${p.compliance.replaceAll("|", "/")} |`);
mkdirSync("docs/compliance", { recursive: true });
writeFileSync(
  "docs/compliance/product-claim-review.md",
  `# Product claim review (internal)

Copied from the design mockup's review notes. These are not legal approval.
A product stays a draft, hidden in production, until its claims, label and price are approved.

| Product | Review note |
|---|---|
${notes.join("\n")}
`,
);

console.log(`Imported ${products.length} products and ${concerns.length} concerns.`);
console.log(missing.length ? `No image for: ${missing.join(", ")}` : "Every product has an image.");
