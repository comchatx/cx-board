import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Window, type Document, type HTMLButtonElement, type HTMLElement } from "happy-dom";
import { afterEach, expect, it } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const css = readFileSync(join(ROOT, "kit", "kit.css"), "utf8");
const js = readFileSync(join(ROOT, "kit", "kit.js"), "utf8");
const theme = JSON.parse(readFileSync(join(ROOT, "kit", "theme.json"), "utf8")) as Record<string, string>;
const windows: Window[] = [];
afterEach(async () => { for (const window of windows.splice(0)) await window.happyDOM.close(); });

// The platform's part: a value for every name the kit reads, on the page's root. Each is a length, so a rule that reads one shows.
const values = `:root { ${Object.keys(theme).map((name, at) => `${name}: ${at + 1}px;`).join(" ")} }`;

// A page of its own: plain tags, and classes a page may well use for itself, under the dark theme.
const plain = `<h1>Restock</h1><p class="row">A <a href="#x">link</a> and <code>x</code>.</p><button>Plain</button><button class="primary">Go</button>
<input class="entry-field"><div class="markdown"><table><tr><th>A</th><td>1</td></tr></table></div><article class="entry"><p class="entry-meta">07:48</p></article>
<ul class="kit-files"><li>a.csv</li></ul><span class="icon">i</span>`;

type Kit = { chart: (spec: unknown) => HTMLElement; timeline: (spec: unknown) => HTMLElement; views: (spec: unknown) => HTMLElement };

function page(body: string, bodyClass = ""): { window: Window; document: Document; load: () => Kit } {
  const window = new Window({ url: "https://pages.invalid/" });
  windows.push(window);
  const document = window.document;
  document.write(`<!doctype html><html lang="en" data-theme="dark"><head><style>${values}</style><style>${css}</style></head><body class="${bodyClass}">${body}</body></html>`);
  // The board inlines the script before the page's code; here it runs with the page's window as its globals.
  const load = () => { new Function("window", `with (window) { ${js} }`)(window); return (window as unknown as { Kit: Kit }).Kit; };
  return { window, document, load };
}

const PROPERTIES = ["color", "background-color", "font-family", "font-size", "font-weight", "line-height", "padding-top", "padding-left", "margin-top", "border-top-width", "border-top-color", "border-top-left-radius", "display", "box-sizing", "outline-style", "width", "height"];
function look(window: Window, document: Document): string[] {
  return [...document.querySelectorAll("html, body, body *")].map((element) => {
    const style = window.getComputedStyle(element as never);
    return `${element.tagName}.${element.className} ${PROPERTIES.map((name) => `${name}=${style.getPropertyValue(name)}`).join(" ")}`;
  });
}

it("leaves a page that does not take the kit as it was written: its markup, its attributes and its look, with the kit's sheet and script both in", () => {
  const bare = page(plain);
  bare.document.querySelectorAll("style")[1]!.remove();
  const before = { markup: bare.document.documentElement.outerHTML, look: look(bare.window, bare.document) };

  const withKit = page(plain);
  const lookWithSheet = look(withKit.window, withKit.document);
  withKit.load();
  // Only the kit's own stylesheet differs between the two documents.
  expect(withKit.document.documentElement.outerHTML.replace(/<style>[\s\S]*?<\/style>/g, "")).toBe(before.markup.replace(/<style>[\s\S]*?<\/style>/g, ""));
  expect(lookWithSheet).toEqual(before.look);
  expect(look(withKit.window, withKit.document)).toEqual(before.look);
  withKit.document.querySelector("button")!.dispatchEvent(new withKit.window.Event("mouseenter") as never);
  withKit.window.dispatchEvent(new withKit.window.Event("scroll") as never);
  expect(withKit.document.querySelector(".cx-tip")).toBeNull();
});

it("draws the same markup in the kit's look once the page takes it by class=\"kit\" on its body", () => {
  const bare = page(plain);
  const kit = page(plain, "kit");
  const button = (document: Document, window: Window) => window.getComputedStyle(document.querySelector("button") as never);
  // `--radius` is the theme's 38th name here, so 38px.
  expect(button(kit.document, kit.window).getPropertyValue("border-top-left-radius")).toBe(`${Object.keys(theme).indexOf("--radius") + 1}px`);
  expect(button(bare.document, bare.window).getPropertyValue("border-top-left-radius")).not.toBe(button(kit.document, kit.window).getPropertyValue("border-top-left-radius"));
});

it("gives the chart's bars and the timeline's rows one Tab stop each, the arrows between them, and the label of the one the keyboard is on", () => {
  const { window, document, load } = page("", "kit");
  const Kit = load();
  const picked: string[] = [];
  const chart = Kit.chart({ label: "c", most: 10, scale: ["10", "0"], bars: [{ name: "a", figure: "1", value: 1 }, { name: "b", figure: "2", value: 2 }, { name: "c", figure: "3", value: 3 }] });
  const timeline = Kit.timeline({ label: "t", hours: [{ at: 0, words: "6" }], spans: [{ id: "x", name: "x", from: 0, to: 0.5, words: "one" }, { id: "y", name: "y", from: 0.5, to: 1, state: "failed", words: "two" }], pick: (id: string) => picked.push(id) });
  document.body.append(chart, timeline);
  const bars = [...chart.querySelectorAll("button")] as HTMLButtonElement[];
  const spans = [...timeline.querySelectorAll("button")] as HTMLButtonElement[];
  expect(bars.map((bar) => bar.tabIndex)).toEqual([0, -1, -1]);
  expect(spans.map((span) => span.tabIndex)).toEqual([0, -1]);
  expect(bars.map((bar) => bar.getAttribute("aria-label"))).toEqual(["a, 1", "b, 2", "c, 3"]);

  const press = (target: HTMLElement, key: string) => target.dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }) as never);
  bars[0]!.focus();
  press(bars[0]!, "ArrowRight");
  expect(document.activeElement).toBe(bars[1]);
  expect(bars.map((bar) => bar.tabIndex)).toEqual([-1, 0, -1]);
  press(bars[1]!, "End");
  expect(document.activeElement).toBe(bars[2]);
  press(bars[2]!, "ArrowRight");
  expect(document.activeElement).toBe(bars[2]);
  press(bars[2]!, "ArrowDown");
  expect(document.activeElement).toBe(bars[2]);

  spans[0]!.focus();
  press(spans[0]!, "ArrowDown");
  expect(document.activeElement).toBe(spans[1]);
  spans[1]!.click();
  expect(picked).toEqual(["y"]);

  bars[0]!.dispatchEvent(new window.Event("mouseenter") as never);
  const tip = document.querySelector(".cx-tip") as HTMLElement;
  expect(tip.textContent).toBe("a, 1");
  expect(tip.hidden).toBe(false);
  bars[0]!.dispatchEvent(new window.Event("mouseleave") as never);
  expect(tip.hidden).toBe(true);

  document.documentElement.lang = "zh-CN";
  const zh = Kit.chart({ label: "c", most: 1, scale: ["1", "0"], bars: [{ name: "a", figure: "1", value: 1 }] });
  expect(zh.querySelector("button")!.getAttribute("aria-label")).toBe("a，1");
});
