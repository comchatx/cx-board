/// <reference lib="dom" />
// A document read whole in a real browser: the Markdown viewer under the kit, GitHub's rules and the board's five changes to them, in
// both themes; and a card waiting on the board, under the kit's own `.markdown`.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Browser, Page } from "playwright-core";
import { afterAll, beforeAll, expect, it } from "vitest";
import { launch } from "./browser.js";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

// The platform's values, each one a page can tell apart, as the board hands them on the page's root.
const VALUES = ":root { --ground: rgb(250, 248, 243); --ink: rgb(30, 30, 30); --act: rgb(31, 107, 74); --float-hover: rgb(228, 226, 219); --font-ui: Arial, sans-serif; --font-mono: \"Courier New\", monospace; --radius-small: 4px; --space-1: 2px; --wash: rgb(240, 238, 232); --line: rgb(220, 220, 220); --size-small: 14px; --leading-small: 1.5; }";
const REPORT = "<h2>Returns</h2><p>See <a href=\"https://example.invalid/\">the seller page</a> and <code>Material</code>.</p><table><thead><tr><th>Reason</th><th>Count</th></tr></thead><tbody><tr><td>Thin</td><td>9</td></tr><tr><td>Colour</td><td>6</td></tr></tbody></table>";

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

/** The viewer as the board draws it, at a width and in a theme, handed `REPORT` as the board's pipeline would draw it. */
async function viewer(width: number, theme: "light" | "dark"): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const board = "const hearing = []; window.cxBoard = { on(name, listener) { if (name === 'file') hearing.push(listener); }, markdown: (text) => Promise.resolve(text) }; window.handFile = (text) => { for (const one of hearing) one({ text }); };";
  const head = `<style>${VALUES}</style><script>document.documentElement.dataset.theme = ${JSON.stringify(theme)}; ${board}</script><style>${read("kit/kit.css")}</style><script>${read("kit/kit.js")}</script>`;
  await page.setContent(read("viewers/markdown.html").replace(/^<!doctype html>\s*/i, (doctype) => doctype + head));
  await page.evaluate((html) => (window as unknown as { handFile: (text: string) => void }).handFile(html), REPORT);
  await page.waitForSelector(".markdown-body table");
  return page;
}

const style = (page: Page, selector: string, properties: readonly string[]) => page.$eval(selector, (element, names) => {
  const computed = getComputedStyle(element);
  return Object.fromEntries(names.map((name) => [name, computed.getPropertyValue(name)]));
}, properties);

it("reads a report whole under GitHub's rules: the board's ground and faces, the theme's link, GitHub's table, in GitHub's file view", async () => {
  const page = await viewer(1280, "light");
  expect(await style(page, ".markdown-body", ["background-color", "font-family", "color", "font-size", "max-width", "padding-left", "margin-left"])).toEqual({
    "background-color": "rgba(0, 0, 0, 0)", "font-family": "Arial, sans-serif", color: "rgb(31, 35, 40)", "font-size": "16px", "max-width": "980px", "padding-left": "45px", "margin-left": "150px",
  });
  expect(await style(page, ".markdown-body code", ["font-family", "background-color"])).toEqual({ "font-family": "\"Courier New\", monospace", "background-color": "rgba(129, 139, 152, 0.12)" });
  expect(await style(page, ".markdown-body tbody tr", ["background-color"])).toEqual({ "background-color": "rgba(0, 0, 0, 0)" });
  // GitHub's table: its head centred, its cells to the start.
  expect([await style(page, ".markdown-body th", ["text-align"]), await style(page, ".markdown-body td", ["text-align"])]).toEqual([{ "text-align": "center" }, { "text-align": "start" }]);
  const link = ".markdown-body a";
  expect(await style(page, link, ["color", "text-decoration-line", "background-color"])).toEqual({ color: "rgb(31, 107, 74)", "text-decoration-line": "none", "background-color": "rgba(0, 0, 0, 0)" });
  await page.hover(link);
  expect(await style(page, link, ["text-decoration-line", "background-color", "border-top-left-radius"])).toEqual({ "text-decoration-line": "none", "background-color": "rgb(228, 226, 219)", "border-top-left-radius": "4px" });
  await page.mouse.move(0, 0);
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("A");
  expect(await style(page, link, ["outline-style", "outline-width", "outline-color"])).toEqual({ "outline-style": "solid", "outline-width": "2px", "outline-color": "rgb(31, 107, 74)" });
  await page.close();
});

it("draws GitHub's dark colours under the dark theme, and GitHub's narrow file view under 767px", async () => {
  const dark = await viewer(1280, "dark");
  expect(await style(dark, ".markdown-body", ["color", "background-color", "color-scheme"])).toEqual({ color: "rgb(240, 246, 252)", "background-color": "rgba(0, 0, 0, 0)", "color-scheme": "dark" });
  expect(await style(dark, ".markdown-body code", ["background-color"])).toEqual({ "background-color": "rgba(101, 108, 118, 0.2)" });
  await dark.close();
  const narrow = await viewer(700, "light");
  expect(await style(narrow, ".markdown-body", ["padding-left", "margin-left"])).toEqual({ "padding-left": "15px", "margin-left": "0px" });
  await narrow.close();
});

it("changes two things of a card waiting on the board: inline code is GitHub's grey block, and a link has no underline at rest", async () => {
  for (const [theme, ground] of [["light", "rgba(129, 139, 152, 0.12)"], ["dark", "rgba(101, 108, 118, 0.2)"]] as const) {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html data-theme="${theme}"><head><style>${VALUES}</style><style>${read("kit/kit.css")}</style></head><body class="kit"><div class="markdown"><p>In <a href="https://example.invalid/">the seller page</a> add <code>Material</code>.</p></div></body></html>`);
    expect(await style(page, ".markdown code", ["background-color", "padding-left", "padding-top", "border-top-left-radius", "font-size"])).toEqual({
      "background-color": ground, "padding-left": "4.76px", "padding-top": "2.38px", "border-top-left-radius": "6px", "font-size": "11.9px",
    });
    expect(await style(page, ".markdown a", ["color", "text-decoration-line"])).toEqual({ color: "rgb(31, 107, 74)", "text-decoration-line": "none" });
    await page.close();
  }
});

it("leaves a fenced block on a waiting card as it was: its code keeps the block's size and wrapping beside inline code that takes GitHub's", async () => {
  for (const theme of ["light", "dark"] as const) {
    const page = await browser.newPage();
    await page.setContent(`<!doctype html><html data-theme="${theme}"><head><style>${VALUES}</style><style>${read("kit/kit.css")}</style></head><body class="kit"><div class="markdown"><p>Set <code>Material</code>.</p><code id="bare">Bare</code><pre><code>a  b</code></pre><pre><span><code id="deep">c  d</code></span></pre></div></body></html>`);
    const block = await style(page, ".markdown pre", ["font-size", "white-space"]);
    expect(await style(page, ".markdown pre code", ["font-size", "white-space", "background-color", "padding-left"])).toEqual({ "font-size": block["font-size"], "white-space": block["white-space"], "background-color": "rgba(0, 0, 0, 0)", "padding-left": "0px" });
    expect(await style(page, ".markdown p code", ["font-size", "white-space"])).toEqual({ "font-size": "11.9px", "white-space": "break-spaces" });
    expect(await style(page, "#bare", ["font-size", "white-space", "background-color"])).toEqual({ "font-size": "11.9px", "white-space": "break-spaces", "background-color": theme === "light" ? "rgba(129, 139, 152, 0.12)" : "rgba(101, 108, 118, 0.2)" });
    expect(await style(page, "#deep", ["font-size", "white-space", "background-color", "padding-left"])).toEqual({ "font-size": block["font-size"], "white-space": block["white-space"], "background-color": "rgba(0, 0, 0, 0)", "padding-left": "0px" });
    await page.close();
  }
});
