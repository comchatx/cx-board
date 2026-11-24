import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Window } from "happy-dom";
import JSZip from "jszip";
import { afterEach, expect, it, vi } from "vitest";

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
  // The board puts the elements' script into the page before the page's own code.
  const scripts = [readFileSync(join(ROOT, "kit", "kit.js"), "utf8"), ...[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((one) => one[1]!)];
  window.document.write(html.replace(/<script>[\s\S]*?<\/script>/g, ""));
  const heard: ((file: File) => void)[] = [];
  const asked: string[] = [];
  const cxBoard = { on: (name: string, listener: (file: File) => void) => { if (name === "file") heard.push(listener); }, markdown: (text: string) => { asked.push(text); return markdown(text); } };
  const scope = Object.assign(Object.create(window) as object, { window, document: window.document, cxBoard, URL: { createObjectURL: (blob: Blob) => `blob:${blob.type}:${String(blob.size)}`, revokeObjectURL: () => {} }, Blob: window.Blob, atob: (text: string) => Buffer.from(text, "base64").toString("latin1") });
  new Function("scope", `with (scope) {\n${scripts.join("\n;\n")}\n}`)(scope);
  const hand = async (file: File) => { for (const one of heard) one(file); await settle(); };
  return { document: window.document, hand, asked };
}
const at = { size: 1, modified: 1 };

it("declares the viewers by the kinds they draw, each page in the package, the picture's, the Word file's, the Excel file's and the PDF's taking bytes", () => {
  expect(manifest.comchatx.viewers).toEqual([
    { files: ["md", "markdown"], page: "viewers/markdown.html" },
    { files: ["csv", "tsv"], page: "viewers/table.html" },
    { files: ["png", "jpg", "jpeg", "gif", "webp"], page: "viewers/picture.html", bytes: true },
    { files: ["docx"], page: "viewers/word.html", bytes: true },
    { files: ["xlsx"], page: "viewers/sheet.html", bytes: true },
    { files: ["pdf"], page: "viewers/pdf.html", bytes: true },
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

it("keeps a CSV's last row where it is one empty quoted cell with no line break after it", async () => {
  const { document, hand } = viewer("viewers/table.html");
  await hand({ path: "x.csv", name: "x.csv", ...at, text: 'note\n""' });
  expect([...document.querySelectorAll("tr")].map((row) => [...row.children].map((cell) => `${cell.tagName}:${cell.textContent}`))).toEqual([["TH:note"], ["TD:"]]);
});

it("draws a picture whole from the bytes it is handed, by its kind, named by the file", async () => {
  const { document, hand } = viewer("viewers/picture.html");
  const img = () => document.querySelector("img")!;
  await hand({ path: "shots/chart.png", name: "chart.png", ...at, bytes: Buffer.from([1, 2, 3]).toString("base64") });
  expect([img().getAttribute("src"), img().getAttribute("alt")]).toEqual(["blob:image/png:3", "chart.png"]);
  await hand({ path: "shots/a.JPG", name: "a.JPG", ...at, bytes: Buffer.from([1, 2]).toString("base64") });
  expect(img().getAttribute("src")).toBe("blob:image/jpeg:2");
});

const DOT = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const rels = (list: readonly (readonly [id: string, type: string, target: string])[]) =>
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${list.map(([id, type, target]) => `<Relationship Id="${id}" Type="${type.includes("://") ? type : `${REL}/${type}`}" Target="${target}"${target.includes(":") ? ' TargetMode="External"' : ""}/>`).join("")}</Relationships>`;
const run = (text: string) => `<w:r><w:t xml:space="preserve">${text}</w:t></w:r>`;
const link = (id: string, text: string) => `<w:hyperlink r:id="${id}">${run(text)}</w:hyperlink>`;

/** A Word file made as Word makes one: its parts zipped, each named in its relationships. */
async function docx(body: string, more: { footnote?: string; styleMap?: string } = {}): Promise<string> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels", rels([["rId1", "officeDocument", "word/document.xml"]]));
  zip.file("word/_rels/document.xml.rels", rels([["rIdRun", "hyperlink", "javascript:parent.postMessage(1)"], ["rIdWeb", "hyperlink", "https://example.com/"], ["rIdDot", "image", "media/dot.png"], ["rIdStyles", "styles", "styles.xml"], ["rIdNotes", "footnotes", "footnotes.xml"], ...(more.styleMap === undefined ? [] : [["rMammothStyleMap", "http://schemas.zwobble.org/mammoth/style-map", "/mammoth/style-map"] as const])]));
  if (more.styleMap !== undefined) zip.file("mammoth/style-map", more.styleMap);
  zip.file("word/styles.xml", `<w:styles ${NS}><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style></w:styles>`);
  zip.file("word/media/dot.png", DOT, { base64: true });
  zip.file("word/document.xml", `<w:document ${NS}><w:body>${body}</w:body></w:document>`);
  zip.file("word/footnotes.xml", `<w:footnotes ${NS}>${more.footnote === undefined ? "" : `<w:footnote w:id="1"><w:p>${more.footnote}</w:p></w:footnote>`}</w:footnotes>`);
  zip.file("word/_rels/footnotes.xml.rels", rels([["rIdRun", "hyperlink", "javascript:parent.postMessage(2)"]]));
  return zip.generateAsync({ type: "base64" });
}
const word = (bytes: string): File => ({ path: "reports/w46.docx", name: "w46.docx", ...at, bytes });

it("draws a Word file by the built-in styles alone, a style map the file carries left unread", async () => {
  const { document, hand } = viewer("viewers/word.html");
  const map = "p => iframe.planted[src='https://example.com/'][data-from='file']:fresh\nr => script.planted";
  hand(word(await docx(`<w:p>${run("Plain words")}</w:p>`, { styleMap: map })));
  await vi.waitFor(() => expect(document.querySelector("#file p")?.textContent).toBe("Plain words"));
  const drawn = [...document.querySelectorAll("#file *")];
  expect(drawn.map((one) => one.tagName)).toEqual(["P"]);
  expect(drawn.flatMap((one) => one.getAttributeNames())).toEqual([]);
});

it("draws a Word file in the answer's own type: its headings, words, tables and pictures, each link as its words alone", async () => {
  const { document, hand } = viewer("viewers/word.html");
  const box = document.querySelector(".markdown")!;
  const picture = `<w:r><w:drawing><wp:inline><wp:docPr id="1" name="dot" descr="a dot"/><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rIdDot"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  const cell = (text: string) => `<w:tc><w:p>${run(text)}</w:p></w:tc>`;
  await hand(word(await docx([
    `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>${run("Week 46")}</w:p>`,
    `<w:p>${run("Read ")}${link("rIdRun", "the claim")}${run(" or ")}${link("rIdWeb", "the site")}</w:p>`,
    `<w:tbl><w:tr>${cell("sku")}${cell("units")}</w:tr><w:tr>${cell("B01")}${cell("3")}</w:tr></w:tbl>`,
    `<w:p>${picture}</w:p>`,
  ].join(""))));
  await vi.waitFor(() => expect(box.innerHTML).not.toBe(""));
  expect(box.innerHTML).toBe(`<h1>Week 46</h1><p>Read the claim or the site</p><table><tbody><tr><td><p>sku</p></td><td><p>units</p></td></tr><tr><td><p>B01</p></td><td><p>3</p></td></tr></tbody></table><p><img alt="a dot" src="data:image/png;base64,${DOT}"></p>`);
  expect(box.querySelectorAll("a")).toHaveLength(0);
});

it("draws a Word file's footnote at its end, a link in the note as its words too", async () => {
  const { document, hand } = viewer("viewers/word.html");
  const box = document.querySelector(".markdown")!;
  await hand(word(await docx(`<w:p>${run("Filed")}<w:r><w:footnoteReference w:id="1"/></w:r></w:p>`, { footnote: `${run("See ")}${link("rIdRun", "the case")}` })));
  await vi.waitFor(() => expect(box.innerHTML).not.toBe(""));
  expect(box.querySelector("li")!.textContent).toBe("See the case ↑");
  expect([...box.querySelectorAll("a")].map((one) => one.getAttribute("href"))).toEqual(["#footnote-1", "#footnote-ref-1"]);
});

it.each([["en", "This file can't be read."], ["zh", "无法读取此文件。"]])("says in %s, as the board does, that a file which is no Word file can't be read, in place of the one drawn before", async (locale, words) => {
  const { document, hand } = viewer("viewers/word.html");
  document.documentElement.dataset.locale = locale;
  const box = document.querySelector(".markdown")!;
  await hand(word(await docx(`<w:p>${run("Kept")}</w:p>`)));
  await vi.waitFor(() => expect(box.textContent).toBe("Kept"));
  await hand(word(Buffer.from("a locked file, or none at all").toString("base64")));
  await vi.waitFor(() => expect(box.textContent).toBe(words));
  expect([box.children.length, box.firstElementChild!.getAttribute("role")]).toEqual([1, "status"]);
});

const XLSX = new Function(`${readFileSync(join(ROOT, "scripts", "sheetjs", "xlsx.mini.min.js"), "utf8")}; return XLSX;`)() as {
  utils: { book_new: () => { Workbook?: { Sheets: { Hidden: number }[] } }; aoa_to_sheet: (rows: unknown[][]) => Record<string, unknown>; book_append_sheet: (book: unknown, sheet: unknown, name: string) => void };
  write: (book: unknown, options: { type: "base64"; bookType: "xlsx" }) => string;
};
/** An Excel file of the named sheets, the hidden ones hidden, made as Excel saves one. */
function xlsx(sheets: Record<string, unknown[][]>, hidden: readonly string[] = []): File {
  const book = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), name);
  book.Workbook = { Sheets: Object.keys(sheets).map((name) => ({ Hidden: hidden.includes(name) ? 1 : 0 })) };
  return { path: "reports/w46.xlsx", name: "w46.xlsx", ...at, bytes: XLSX.write(book, { type: "base64", bookType: "xlsx" }) };
}
const drawn = (document: Window["document"]) => [...document.querySelectorAll("tr")].map((row) => [...row.children].map((cell) => `${cell.tagName}:${cell.textContent}`));

it("draws an Excel file's sheets one at a time under a switch of their names, hidden ones left out, each cell as Excel shows it", async () => {
  const { document, hand } = viewer("viewers/sheet.html");
  const sheet = (rows: unknown[][]) => rows;
  await hand(xlsx({ Sales: sheet([["sku", "units", "share"], ["B01", 3, { t: "n", v: 0.25, z: "0%" }], ["<b>B02</b>", 1200, ""]]), Costs: sheet([["fee"], [1.5]]), Workings: sheet([["secret"]]) }, ["Workings"]));
  const names = () => [...document.querySelectorAll('[role="tab"]')].map((tab) => `${tab.textContent}:${tab.getAttribute("aria-selected")}`);
  expect(names()).toEqual(["Sales:true", "Costs:false"]);
  expect(document.querySelector('[role="tablist"]')!.getAttribute("aria-label")).toBe("w46.xlsx");
  expect(drawn(document)).toEqual([["TH:sku", "TH:units", "TH:share"], ["TD:B01", "TD:3", "TD:25%"], ["TD:<b>B02</b>", "TD:1200", "TD:"]]);
  expect(document.querySelector("b")).toBeNull();
  document.querySelectorAll<Window["HTMLElement"]["prototype"]>('[role="tab"]')[1]!.click();
  expect([names(), drawn(document)]).toEqual([["Sales:false", "Costs:true"], [["TH:fee"], ["TD:1.5"]]]);
});

it.each([["en", "This file can't be read."], ["zh", "无法读取此文件。"]])("draws an Excel file of one sheet with no switch, and says in %s, as the board does, that an encrypted file can't be read", async (locale, words) => {
  const { document, hand } = viewer("viewers/sheet.html");
  document.documentElement.dataset.locale = locale;
  await hand(xlsx({ Only: [["a"], ["1"]], Also: [["b"]] }));
  await hand(xlsx({ Only: [["a"], ["1"]] }));
  expect([document.querySelector('[role="tablist"]'), drawn(document)]).toEqual([null, [["TH:a"], ["TD:1"]]]);
  await hand(xlsx({ Only: [["a"]], Also: [["b"]] }));
  await hand({ path: "locked.xlsx", name: "locked.xlsx", ...at, bytes: Buffer.concat([Buffer.from("d0cf11e0a1b11ae1", "hex"), Buffer.alloc(600)]).toString("base64") });
  const box = document.querySelector("#file")!;
  expect([document.querySelector('[role="tablist"]'), box.textContent, box.children.length, box.firstElementChild!.getAttribute("role")]).toEqual([null, words, 1, "status"]);
});
