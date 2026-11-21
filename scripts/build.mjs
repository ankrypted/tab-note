// Builds the loadable extension into dist/extension.
//  - bundles the TypeScript entry points with esbuild
//  - copies the static files (manifest, popup page and styles, icons)
//  - stamps the manifest with the version from package.json (one source of truth)
import { build } from "esbuild";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const out = join(root, "dist", "extension");

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const common = {
  bundle: true,
  target: "chrome114",
  logLevel: "info",
  legalComments: "none",
};

// Service worker and popup are ES modules; the content script must be a classic script.
await build({
  ...common,
  entryPoints: {
    background: join(src, "background.ts"),
    "popup/popup": join(src, "popup", "popup.ts"),
  },
  outdir: out,
  format: "esm",
});
await build({
  ...common,
  entryPoints: { content: join(src, "content.ts") },
  outdir: out,
  format: "iife",
});

for (const file of ["popup/popup.html", "popup/popup.css"]) {
  mkdirSync(dirname(join(out, file)), { recursive: true });
  cpSync(join(src, file), join(out, file));
}
cpSync(join(src, "icons"), join(out, "icons"), { recursive: true });

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(src, "manifest.json"), "utf8"));
manifest.version = pkg.version;
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log(`Built Tab Note ${pkg.version} -> ${out}`);
