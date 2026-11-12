import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const css = readFileSync(join(ROOT, "kit", "kit.css"), "utf8");
const js = readFileSync(join(ROOT, "kit", "kit.js"), "utf8");
const theme = JSON.parse(readFileSync(join(ROOT, "kit", "theme.json"), "utf8")) as Record<string, string>;
const names = Object.keys(theme).filter((name) => name.startsWith("--"));

/** The string literals of a script, template literals' text between their `${}` included, with its comments left out. */
function literals(source: string): string[] {
  const found: string[] = [];
  let at = 0;
  while (at < source.length) {
    const one = source[at]!;
    const next = source[at + 1];
    if (one === "/" && next === "/") { at = source.indexOf("\n", at); if (at === -1) break; continue; }
    if (one === "/" && next === "*") { at = source.indexOf("*/", at + 2) + 2; continue; }
    if (one === '"' || one === "'") {
      let end = at + 1;
      while (source[end] !== one) end += source[end] === "\\" ? 2 : 1;
      found.push(source.slice(at + 1, end));
      at = end + 1;
      continue;
    }
    if (one === "`") {
      let end = at + 1;
      let text = "";
      while (source[end] !== "`") {
        if (source[end] === "\\") { text += source.slice(end, end + 2); end += 2; continue; }
        if (source[end] === "$" && source[end + 1] === "{") {
          let depth = 1;
          end += 2;
          while (depth > 0) { if (source[end] === "{") depth += 1; else if (source[end] === "}") depth -= 1; end += 1; }
          text += " ";
          continue;
        }
        text += source[end];
        end += 1;
      }
      found.push(text);
      at = end + 1;
      continue;
    }
    at += 1;
  }
  return found;
}

it("is a script the browser can compile, and a stylesheet and a list of the theme's names", () => {
  expect(() => new Function(js)).not.toThrow();
  expect(css).toContain(".kit-chart");
  expect(names.length).toBeGreaterThan(0);
});

it("loads nothing and speaks across no frame's edge: the platform inlines both files under a policy that allows no fetch", () => {
  for (const asks of ["url(", "@import", "image-set("]) expect(css, asks).not.toContain(asks);
  for (const asks of ["fetch(", "import(", "import ", "require(", "XMLHttpRequest", "WebSocket", "EventSource", "sendBeacon", "importScripts", "Worker(", "postMessage", "innerHTML", "eval(", "new Function", ".src", "\"src\"", "\"href\"", "location"]) expect(js, asks).not.toContain(asks);
  // An SVG element is made in its namespace, which is a name and not an address.
  const addresses = [...`${css}\n${js}`.matchAll(/[a-z]+:\/\/[^\s"'`)]*/gi)].map((match) => match[0]);
  expect(addresses).toEqual(["http://www.w3.org/2000/svg"]);
});

it("carries no words of its own: no Chinese, Japanese or Korean, no English phrase in the script's strings, and no generated text in the stylesheet", () => {
  const scripts = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
  expect(css).not.toMatch(scripts);
  expect(js).not.toMatch(scripts);
  const strings = literals(js);
  expect(strings).toContain("kit-bar");
  // A phrase is two words of letters side by side; class names, keys, event names and an icon's path are not, and the script's
  // directive is the language's.
  expect(strings.filter((text) => text !== "use strict" && /\p{L}{2,}\s+\p{L}{2,}/u.test(text))).toEqual([]);
  expect([...css.matchAll(/(?<![\w-])content\s*:\s*([^;}]+)/g)].map((match) => match[1]!.trim()).filter((value) => value !== '""')).toEqual([]);
});

it("reads only the theme's names the platform sets on the page's root, each of them named in kit/theme.json, and sets none of them", () => {
  const read = new Set([...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1]!));
  // The chart and the timeline set their own place on each bar, span and hour, in the element's style.
  const own = new Set([...js.matchAll(/(--[\w-]+):\$\{/g)].map((match) => match[1]!));
  expect([...own].sort()).toEqual(["--at", "--from", "--to", "--v"]);
  expect([...read].filter((name) => !own.has(name)).sort()).toEqual([...names].sort());
  expect(Object.keys(theme).filter((name) => !name.startsWith("--"))).toEqual(["data-theme", "data-locale"]);
  expect(css.match(/(^|[;{\s])--[\w-]+\s*:/g)).toBeNull();
  for (const meaning of Object.values(theme)) expect(meaning.trim()).not.toBe("");
  expect(js).not.toContain("getPropertyValue");
  expect(js).not.toContain("var(--");
});

it("reads the theme the platform names on the root, and the language for nothing but how a name and its figure are joined", () => {
  expect(css).toContain(':where([data-theme="dark"])');
  expect(js).toContain("root.dataset.locale || root.lang");
  expect(js).not.toContain("dataset.theme");
});

it("gives a page the signed elements: a card, a button in its three looks, a field, a table, a count, a switch, a list of files, an empty line, a chart and a timeline", () => {
  for (const rule of [".entry {", "button {", "button.primary {", "button:disabled", ".entry-field {", ".entry-field:not(:placeholder-shown)", ".markdown table", ".bp-figures", ".board-views", ".kit-files", ".file-ref {", ".board-empty", ".kit-chart", ".kit-timeline", ".kit-cards", ".bp-row", ".bp-head", ".cx-tip"]) expect(css, rule).toContain(rule);
  expect(js).toMatch(/window\.Kit = Object\.freeze\(\{[\s\S]*h, icon, chart, timeline, views, file/);
  // One Tab stop each: the bars move with the left and right arrows, the spans with the up and down arrows.
  expect(js).toContain('rove(list, buttons, "ArrowLeft", "ArrowRight")');
  expect(js).toContain('rove(list, buttons, "ArrowUp", "ArrowDown")');
  expect(js).not.toContain("cxBoard =");
});

/** Each selector of the stylesheet, its comments left out, inside an `@media` or not. */
function selectors(source: string): string[] {
  const plain = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const found: string[] = [];
  for (const match of plain.matchAll(/([^{}]+)\{/g)) {
    const head = match[1]!.trim();
    if (head.startsWith("@")) continue;
    let depth = 0;
    let part = "";
    for (const one of head) {
      if (one === "(") depth += 1;
      if (one === ")") depth -= 1;
      if (one === "," && depth === 0) { found.push(part.trim()); part = ""; } else part += one;
    }
    found.push(part.trim());
  }
  return found;
}

it("holds every rule under the class a page takes the kit by, so a page that does not take it is drawn as written", () => {
  const all = selectors(css);
  expect(all.length).toBeGreaterThan(100);
  const outside = all.filter((selector) => {
    const scoped = selector.replace(/^:where\(\[data-theme="(dark|light)"\]\)\s+/, "");
    const first = scoped.split(/\s+|>|\+|~/)[0]!;
    return !(scoped.startsWith(":where(.kit)") || /^(body)?\.kit(?![\w-])/.test(first));
  });
  expect(outside).toEqual([]);
  expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/:root|(^|[\s,}])html[\s.{,:[]/);
});

it("touches nothing at load that it did not make: no write to the page's root or body, no search for the page's own elements, no listener before a label is shown", () => {
  const code = js.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const reach of ["document.body.", "document.documentElement.", "root.", "querySelector", "getElementsBy", "getElementById", "MutationObserver", "document.addEventListener", "document.write", "classList", ".dataset.theme"]) {
    const uses = code.split(reach).length - 1;
    // The label is put in the page's body only where no `.kit` holds the element it labels; `root.dataset.locale` and `root.lang` are read, never written.
    const allowed = { "document.body.": 0, "root.": 2 }[reach] ?? 0;
    expect(uses, reach).toBe(allowed);
  }
  expect(code).toMatch(/\(root\.dataset\.locale \|\| root\.lang\)/);
  // The one listener on the window is added on the first label shown, inside showTip.
  expect([...code.matchAll(/^ {2}addEventListener\(/gm)]).toEqual([]);
  expect(code).toMatch(/function showTip[\s\S]*?addEventListener\("scroll"/);
});
