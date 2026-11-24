// Assembles each viewer page from its source under viewers/src/, a file standing inline where the source
// names it: `lib:<package>/<file>` a pinned dependency's, `file:<directory>/<file>` one carried beside this
// script, `part:<file>` one of viewers/src/. Each library's licence is written beside the pages. A page is
// drawn in a frame of no origin, so nothing can be loaded from the package.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SOURCES = join(ROOT, "viewers", "src");
const NAMED = /<script src="(lib|file|part):((?:@[^/"]+\/)?[^/"]+?)(?:\/([^"]+))?"><\/script>/g;
const HERE = join(ROOT, "scripts");

/** Every file the script writes, by its path from the package's root, with its text. */
export function viewerFiles() {
  const files = new Map();
  for (const name of readdirSync(SOURCES).filter((one) => one.endsWith(".html")).sort()) {
    const source = readFileSync(join(SOURCES, name), "utf8");
    files.set(`viewers/${name}`, source.replace(NAMED, (_, from, at, file) => {
      if (from === "part") return `<script>${readFileSync(join(SOURCES, at), "utf8")}</script>`;
      const home = from === "lib" ? join(ROOT, "node_modules", at) : join(HERE, at);
      files.set(`viewers/licences/${at.replace("/", "-")}.txt`, readFileSync(join(home, "LICENSE"), "utf8"));
      return `<script>${readFileSync(join(home, file), "utf8").replace(/<\/(script)/gi, "<\\/$1")}</script>`;
    }));
  }
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(join(ROOT, "viewers", "licences"), { recursive: true });
  for (const [path, text] of viewerFiles()) writeFileSync(join(ROOT, path), text);
}
