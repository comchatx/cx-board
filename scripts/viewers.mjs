// Assembles each viewer page from its source under viewers/src/, a library's file standing inline where
// the source names it (`<script src="lib:<package>/<file>"></script>`), and writes each library's licence
// beside the pages. A page is drawn in a frame of no origin, so a library cannot be loaded from the package.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SOURCES = join(ROOT, "viewers", "src");
const NAMED = /<script src="lib:((?:@[^/"]+\/)?[^/"]+)\/([^"]+)"><\/script>/g;

/** Every file the script writes, by its path from the package's root, with its text. */
export function viewerFiles() {
  const files = new Map();
  for (const name of readdirSync(SOURCES).filter((one) => one.endsWith(".html")).sort()) {
    const source = readFileSync(join(SOURCES, name), "utf8");
    files.set(`viewers/${name}`, source.replace(NAMED, (_, pkg, file) => {
      files.set(`viewers/licences/${pkg.replace("/", "-")}.txt`, readFileSync(join(ROOT, "node_modules", pkg, "LICENSE"), "utf8"));
      return `<script>${readFileSync(join(ROOT, "node_modules", pkg, file), "utf8").replace(/<\/(script)/gi, "<\\/$1")}</script>`;
    }));
  }
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(join(ROOT, "viewers", "licences"), { recursive: true });
  for (const [path, text] of viewerFiles()) writeFileSync(join(ROOT, path), text);
}
