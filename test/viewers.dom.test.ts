import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Window } from "happy-dom";
import { afterEach, expect, it } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { comchatx: { viewers: { files: string[]; page: string; bytes?: true }[] } };
const windows: Window[] = [];
afterEach(async () => { for (const window of windows.splice(0)) await window.happyDOM.close(); });

type File = { path: string; name: string; size: number; modified: number; text?: string; bytes?: string };
const settle = async (): Promise<void> => { for (let n = 0; n < 5; n++) await Promise.resolve(); };

/** A viewer's page with the board's bridge stood in for: what it hears, and what it asks the board to draw. */
function viewer(page: string, markdown: (text: string) => Promise<string> = async (text) => `<p>${text}</p>`) {
  const window = new Window({ url: "https://pages.invalid/" });
  windows.push(window);
  const html = readFileSync(join(ROOT, page), "utf8");
  const script = /<script>([\s\S]*)<\/script>/.exec(html)![1]!;
  window.document.write(html.replace(/<script>[\s\S]*<\/script>/, ""));
  const heard: ((file: File) => void)[] = [];
  const asked: string[] = [];
  const cxBoard = { on: (name: string, listener: (file: File) => void) => { if (name === "file") heard.push(listener); }, markdown: (text: string) => { asked.push(text); return markdown(text); } };
  new Function("window", "document", "cxBoard", "URL", "Blob", "atob", script)(window, window.document, cxBoard, { createObjectURL: (blob: Blob) => `blob:${blob.type}:${String(blob.size)}`, revokeObjectURL: () => {} }, window.Blob, (text: string) => Buffer.from(text, "base64").toString("latin1"));
  const hand = async (file: File) => { for (const one of heard) one(file); await settle(); };
  return { document: window.document, hand, asked };
}
const at = { size: 1, modified: 1 };

it("declares the three viewers by the kinds they draw, each page in the package, the picture's taking bytes", () => {
  expect(manifest.comchatx.viewers).toEqual([
    { files: ["md", "markdown"], page: "viewers/markdown.html" },
    { files: ["csv", "tsv"], page: "viewers/table.html" },
    { files: ["png", "jpg", "jpeg", "gif", "webp"], page: "viewers/picture.html", bytes: true },
  ]);
  for (const one of manifest.comchatx.viewers) expect(readFileSync(join(ROOT, one.page), "utf8")).toMatch(/<body class="kit">/);
});

it("draws a Markdown file through the board's own pipeline each time it is handed, the last drawing kept where two cross", async () => {
  const { document, hand, asked } = viewer("viewers/markdown.html");
  await hand({ path: "reports/w46.md", name: "w46.md", ...at, text: "# Week 46" });
  expect([asked, document.querySelector(".markdown")!.innerHTML]).toEqual([["# Week 46"], "<p># Week 46</p>"]);
  const slow: ((html: string) => void)[] = [];
  const crossing = viewer("viewers/markdown.html", (text) => (text === "old" ? new Promise((done) => slow.push(done)) : Promise.resolve(`<p>${text}</p>`)));
  await crossing.hand({ path: "a.md", name: "a.md", ...at, text: "old" });
  await crossing.hand({ path: "a.md", name: "a.md", ...at, text: "new" });
  slow[0]!("<p>old</p>");
  await settle();
  expect(crossing.document.querySelector(".markdown")!.innerHTML).toBe("<p>new</p>");
});

it("draws a CSV with its first row as the head, quotes, commas and line breaks inside quotes kept as words, and a TSV by its tabs", async () => {
  const { document, hand } = viewer("viewers/table.html");
  const rows = () => [...document.querySelectorAll("tr")].map((row) => [...row.children].map((cell) => `${cell.tagName}:${cell.textContent}`));
  await hand({ path: "sales.csv", name: "sales.csv", ...at, text: '﻿sku,units,note\r\nB01,3,"a ""good"" week, mostly"\nB02,7,"two\nlines"\n' });
  expect(rows()).toEqual([["TH:sku", "TH:units", "TH:note"], ["TD:B01", "TD:3", 'TD:a "good" week, mostly'], ["TD:B02", "TD:7", "TD:two\nlines"]]);
  await hand({ path: "x.tsv", name: "x.TSV", ...at, text: 'a\t"b"\n1\t2' });
  expect(rows()).toEqual([["TH:a", 'TH:"b"'], ["TD:1", "TD:2"]]);
  await hand({ path: "x.csv", name: "x.csv", ...at, text: "<b>raw</b>" });
  expect([rows(), document.querySelector("b")]).toEqual([[["TH:<b>raw</b>"]], null]);
});

it("draws a picture whole from the bytes it is handed, by its kind, named by the file", async () => {
  const { document, hand } = viewer("viewers/picture.html");
  const img = () => document.querySelector("img")!;
  await hand({ path: "shots/chart.png", name: "chart.png", ...at, bytes: Buffer.from([1, 2, 3]).toString("base64") });
  expect([img().getAttribute("src"), img().getAttribute("alt")]).toEqual(["blob:image/png:3", "chart.png"]);
  await hand({ path: "shots/a.JPG", name: "a.JPG", ...at, bytes: Buffer.from([1, 2]).toString("base64") });
  expect(img().getAttribute("src")).toBe("blob:image/jpeg:2");
});
