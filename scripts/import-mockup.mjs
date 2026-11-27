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

// The mockup misspells some slugs. The pack label is the reference.
// Image resources are still looked up under the mockup's own slug.
const slugFixes = new Map([["herbasome", "herbosome"]]);
const fixSlug = (slug) => slugFixes.get(slug) ?? slug;

const slugOf = new Map(data.products.map((p) => [p.slug, p]));
const concerns = data.concerns.map(([name, slug, productSlugs], position) => {
  for (const product of productSlugs) {
    if (!slugOf.has(product)) throw new Error(`${slug} lists unknown product ${product}`);
  }
  return { slug, name, position, products: productSlugs.map(fixSlug) };
});

// The mockup mixes staff notes into shopper text. Move each one to reviewNotes.
// The test in tests/unit/catalog.test.ts catches the known note phrases.
const staffNotes = [
  {
    slug: "menmaxx",
    field: "benefits",
    text: "Patent-pending formula (per brand; verify before publishing)",
    replacement: null,
  },
  {
    slug: "menmaxx",
    field: "precautions",
    text: "Contains Sarpagandha: regulatory and medical review needed before online claims.",
    replacement: "",
  },
  {
    slug: "stressnil",
    field: "precautions",
    text: "Women 18+ (formulation focus).",
    replacement: "Women 18+.",
  },
];

function separateNotes(product) {
  const clean = { ...product };
  const reviewNotes = [];
  for (const { slug, field, text, replacement } of staffNotes) {
    if (slug !== clean.slug) continue;
    const value = clean[field];
    if (!value.includes(text)) throw new Error(`${slug}: the staff note in ${field} has changed.`);
    clean[field] = Array.isArray(value)
      ? value.flatMap((item) => (item !== text ? [item] : replacement ? [replacement] : []))
      : value.replace(text, replacement).trim();
    reviewNotes.push(`${field}: ${text}`);
  }
  return reviewNotes.length ? { ...clean, reviewNotes } : clean;
}

const products = data.products.map((p, position) => separateNotes({
  slug: fixSlug(p.slug),
  position,
  name: p.display,
  tagline: p.tagline,
  // Shoppers don't need the capsule shell size.
  format: p.format.replace(" (size 00)", ""),
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
for (const { slug: mockupSlug } of data.products) {
  const slug = fixSlug(mockupSlug);
  const id = resources.get(`img_${mockupSlug}_800x1200`);
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
