// Writes GitHub's Markdown rules, `github-markdown-css` at the version package.json pins, into kit/kit.css between its two marks, and
// its licence beside the kit. GitHub publishes the rules twice, a light file and a dark one that differ only in colours: the kit holds
// the rules once, each colour the two files differ in read from a custom property of the kit's own (`--gh-<n>`), and the two sets of
// those values hang on the page's `data-theme`, light where it names none. Every rule is put under `.kit`, as the kit's own are, by
// `:where(.kit)`, which keeps GitHub's weights. Nothing else of GitHub's text changes; what the board changes of it follows in kit.css.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const HOME = join(ROOT, "node_modules", "github-markdown-css");
export const BEGIN = "/* ---- GitHub's Markdown rules: written by `npm run kit` from github-markdown-css";
export const END = "/* ---- End of GitHub's Markdown rules ---- */";

/** A stylesheet of plain rules as [selectors, declarations as [property, value]]; GitHub's files hold no at-rule. */
function rules(text) {
  const plain = text.replace(/\/\*[\s\S]*?\*\//g, "");
  if (plain.includes("@")) throw new Error("github-markdown-css holds an at-rule the script does not read");
  return [...plain.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => [
    split(selectors),
    body.split(";").map((one) => one.trim()).filter(Boolean).map((one) => { const at = one.indexOf(":"); return [one.slice(0, at).trim(), one.slice(at + 1).trim()]; }),
  ]);
}

/** A selector list split at its top-level commas, a comma inside `:has(…)` or `:not(…)` left in its selector. */
function split(list) {
  const out = [];
  let depth = 0;
  let from = 0;
  for (let at = 0; at < list.length; at++) {
    if (list[at] === "(") depth++;
    else if (list[at] === ")") depth--;
    else if (list[at] === "," && depth === 0) { out.push(list.slice(from, at).trim()); from = at + 1; }
  }
  out.push(list.slice(from).trim());
  if (!out.every((one) => one.startsWith(".markdown-body"))) throw new Error("github-markdown-css holds a selector outside .markdown-body");
  return out;
}

const under = (selectors) => selectors.map((one) => `:where(.kit) ${one}`).join(", ");

/** The section of kit/kit.css, its marks included, and the licence, as the pinned release makes them. */
export function githubKit() {
  const version = JSON.parse(readFileSync(join(HOME, "package.json"), "utf8")).version;
  const light = rules(readFileSync(join(HOME, "github-markdown-light.css"), "utf8"));
  const dark = rules(readFileSync(join(HOME, "github-markdown-dark.css"), "utf8"));
  if (light.length !== dark.length) throw new Error("github-markdown-css's light and dark files hold different rules");
  const pairs = new Map();
  const body = light.map(([selectors, declarations], index) => {
    const [otherSelectors, otherDeclarations] = dark[index];
    if (selectors.join() !== otherSelectors.join() || declarations.length !== otherDeclarations.length) throw new Error(`github-markdown-css's rule ${selectors.join()} differs in more than its colours`);
    const lines = declarations.map(([property, value], at) => {
      const [otherProperty, otherValue] = otherDeclarations[at];
      if (property !== otherProperty) throw new Error(`github-markdown-css's rule ${selectors.join()} differs in more than its colours`);
      if (value === otherValue) return `${property}: ${value};`;
      const key = `${value}|${otherValue}`;
      if (!pairs.has(key)) pairs.set(key, { name: `--gh-${pairs.size + 1}`, light: value, dark: otherValue });
      return `${property}: var(${pairs.get(key).name});`;
    });
    return `${under(selectors)} { ${lines.join(" ")} }`;
  });
  const values = (theme) => [...pairs.values()].map((one) => `${one.name}: ${one[theme]};`).join(" ");
  const section = [
    `${BEGIN} ${version} (MIT, its licence in kit/licences/github-markdown-css.txt) ---- */`,
    `:where(.kit) .markdown-body { ${values("light")} }`,
    `:where([data-theme="dark"]) :where(.kit) .markdown-body { ${values("dark")} }`,
    ...body,
    END,
  ].join("\n");
  return { section, licence: readFileSync(join(HOME, "license"), "utf8") };
}

/** kit/kit.css with its section between the marks as the pinned release makes it. */
export function kitCss(css = readFileSync(join(ROOT, "kit", "kit.css"), "utf8")) {
  const from = css.indexOf(BEGIN);
  const to = css.indexOf(END);
  if (from === -1 || to < from) throw new Error("kit/kit.css holds no marks for GitHub's Markdown rules");
  return css.slice(0, from) + githubKit().section + css.slice(to + END.length);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(join(ROOT, "kit", "kit.css"), kitCss());
  mkdirSync(join(ROOT, "kit", "licences"), { recursive: true });
  writeFileSync(join(ROOT, "kit", "licences", "github-markdown-css.txt"), githubKit().licence);
}
