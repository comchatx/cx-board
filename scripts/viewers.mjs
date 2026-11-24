// Assembles each viewer page from its source under viewers/src/, a file standing inline where the source
// names it: `lib:<package>/<file>` a pinned dependency's, `file:<directory>/<file>` one carried beside this
// script, `part:<file>` one of viewers/src/, and `cmaps:pdfjs-dist` the PDF library's Chinese character maps
// as `CMAPS`, by file name, in base64. Each library's licence is written beside the pages. A page is drawn in a
// frame of no origin, so nothing can be loaded from the package.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SOURCES = join(ROOT, "viewers", "src");
const NAMED = /<script( type="module")? src="(lib|file|part|cmaps):((?:@[^/"]+\/)?[^/"]+?)(?:\/([^"]+))?"><\/script>/g;
// Simplified and Traditional Chinese: the maps a Chinese PDF's fonts name when the file does not carry them.
const CHINESE = /^(Adobe-(GB1|CNS1)|UniGB|UniCNS|GB|CNS|B5|ETen|ETHK|HK)/;
const HERE = join(ROOT, "scripts");

/** Every file the script writes, by its path from the package's root, with its text. */
export function viewerFiles() {
  const files = new Map();
  for (const name of readdirSync(SOURCES).filter((one) => one.endsWith(".html")).sort()) {
    const source = readFileSync(join(SOURCES, name), "utf8");
    files.set(`viewers/${name}`, source.replace(NAMED, (_, module = "", from, at, file) => {
      if (from === "part") return `<script${module}>${readFileSync(join(SOURCES, at), "utf8")}</script>`;
      if (from === "cmaps") {
        const home = join(ROOT, "node_modules", at, "cmaps");
        files.set(`viewers/licences/${at}-cmaps.txt`, readFileSync(join(home, "LICENSE"), "utf8"));
        const maps = readdirSync(home).filter((one) => CHINESE.test(one)).sort().map((one) => [one, readFileSync(join(home, one)).toString("base64")]);
        return `<script>const CMAPS = ${JSON.stringify(Object.fromEntries(maps))};</script>`;
      }
      const home = from === "lib" ? join(ROOT, "node_modules", at) : join(HERE, at);
      files.set(`viewers/licences/${at.replace("/", "-")}.txt`, readFileSync(join(home, "LICENSE"), "utf8"));
      return `<script${module}>${readFileSync(join(home, file), "utf8").replace(/<\/(script)/gi, "<\\/$1")}</script>`;
    }));
  }
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(join(ROOT, "viewers", "licences"), { recursive: true });
  for (const [path, text] of viewerFiles()) writeFileSync(join(ROOT, path), text);
}
