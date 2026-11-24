/// <reference lib="dom" />
// A viewer page in a real browser, drawn as the board draws it: in a frame of no origin under the page policy the platform writes
// (ComChatX's `src/platform/pages-proxy.ts`), with the kit and a `cxBoard` that hears the file the board hands. The browser is the
// installed Chrome, which the CI's runner carries.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Frame, type Page } from "playwright-core";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const POLICY = "default-src 'none'; script-src 'unsafe-inline' https:; style-src 'unsafe-inline' https:; img-src data: blob: https:; font-src data: https:; media-src data: blob: https:; connect-src https:; frame-src https:; form-action https:; base-uri 'none'";
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

function framed(path: string, locale: string): string {
  const root = ":root{--space-4:12px;--space-5:16px;--space-6:24px;--line:#e5e5e5;--quiet:#6b6b6b;--size-caption:12px;--leading-small:1.4}";
  const board = `document.documentElement.dataset.locale = ${JSON.stringify(locale)};
    const hearing = { file: [] };
    Object.defineProperty(window, "cxBoard", { value: Object.freeze({ on(name, listener) { hearing[name]?.push(listener); } }) });
    addEventListener("message", (event) => { if (event.data?.cx === "file") for (const one of hearing.file) one(event.data.file); });`;
  const head = `<meta http-equiv="content-security-policy" content="${POLICY}"><style>${root}</style><script>${board}</script>`
    + `<style>${read("kit/kit.css")}</style><script>${read("kit/kit.js")}</script>`;
  return read(path).replace(/^<!doctype html>\s*/i, (doctype) => doctype + head);
}

export type Drawn = { readonly page: Page; readonly frame: Frame; readonly asked: readonly string[]; readonly errors: readonly string[]; readonly hand: (bytes: string) => Promise<void> };

/** The page at `path` in a frame of no origin, handed a file by `hand`; `asked` lists every address the browser was asked for, `errors` what the page threw. */
export async function drawn(browser: Browser, path: string, locale = "en"): Promise<Drawn> {
  const page = await browser.newPage({ viewport: { width: 760, height: 900 } });
  const asked: string[] = [], errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { if (request.url() !== "https://board.test/") asked.push(request.url()); });
  await page.route("https://board.test/", (route) => route.fulfill({ contentType: "text/html", body: '<!doctype html><body style="margin:0"><iframe sandbox="allow-scripts" style="border:0;width:100%;height:100vh"></iframe></body>' }));
  await page.goto("https://board.test/");
  await page.evaluate((html) => new Promise<void>((done) => {
    const frame = document.querySelector("iframe")!;
    frame.addEventListener("load", () => done(), { once: true });
    frame.srcdoc = html;
  }), framed(path, locale));
  const frame = page.frames().find((one) => one !== page.mainFrame())!;
  const hand = (bytes: string) => page.evaluate((file) => document.querySelector("iframe")!.contentWindow!.postMessage({ cx: "file", file }, "*"), { path: "reports/w46.pdf", name: "w46.pdf", size: bytes.length, modified: "2026-11-24T00:00:00.000Z", bytes });
  return { page, frame, asked, errors, hand };
}

export const launch = (): Promise<Browser> => chromium.launch({ channel: "chrome" });
