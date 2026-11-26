// Fails if production code imports test code, or exposes a secret to the browser.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const rules = [
  {
    message: "production code must not import from tests/",
    pattern: /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["'](?:[^"']*\/)?tests\//,
  },
  {
    message: "a NEXT_PUBLIC_ variable is sent to the browser and must not hold a secret",
    pattern: /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE|DATABASE)/,
  },
];

export function findViolations(file, source) {
  return rules.filter((rule) => rule.pattern.test(source)).map((rule) => `${file}: ${rule.message}`);
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "generated" ? [] : sourceFiles(path);
    return /\.(?:[cm]?[jt]sx?)$/.test(entry.name) ? [path] : [];
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const root = process.cwd();
  const files = sourceFiles(join(root, "src"));
  const violations = files.flatMap((file) =>
    findViolations(relative(root, file), readFileSync(file, "utf8")),
  );
  const example = ".env.example";
  violations.push(...findViolations(example, readFileSync(join(root, example), "utf8")));

  if (violations.length > 0) {
    console.error(violations.join("\n"));
    process.exit(1);
  }
  console.log(`Boundary check passed (${files.length} source files).`);
}
