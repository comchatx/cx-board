/// <reference lib="dom" />
import type { Browser } from "playwright-core";
import { afterAll, beforeAll, expect, it } from "vitest";
import { drawn, launch } from "./browser.js";
import { pdfFile } from "./pdf-file.js";

let browser: Browser;
beforeAll(async () => { browser = await launch(); });
afterAll(async () => { await browser?.close(); });

/** How many of a drawn page's pixels are not white: words drawn, or none. */
const inked = (frame: import("playwright-core").Frame, at: number) => frame.evaluate(async (n) => {
  const picture = document.querySelectorAll("#file img")[n] as HTMLImageElement;
  await picture.decode();
  const canvas = new OffscreenCanvas(picture.naturalWidth, picture.naturalHeight), context = canvas.getContext("2d")!;
  context.drawImage(picture, 0, 0);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height / 4);
  let count = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i]! < 200) count++;
  return count;
}, at);

it("draws each page of a PDF at the tab's width, one under another, a page whose words are in a font the file does not carry among them, reaching nothing", async () => {
  const { frame, asked, errors, hand, page } = await drawn(browser, "viewers/pdf.html");
  await hand(pdfFile([{ lines: ["Week 46 sales", "Units 1,284"] }, { chinese: "第46周销售报告" }, { lines: ["Last page"], box: true }]));
  await frame.waitForFunction(() => document.querySelectorAll("#file img").length === 3);
  const sizes = await frame.$$eval("#file img", (pictures) => (pictures as HTMLImageElement[]).map((one) => [Math.round(one.getBoundingClientRect().width), one.naturalWidth > 0]));
  expect(sizes).toEqual([[760, true], [760, true], [760, true]]);
  expect(await inked(frame, 0)).toBeGreaterThan(50);
  expect(await inked(frame, 1)).toBeGreaterThan(50);
  expect(asked.filter((address) => !address.startsWith("blob:") && !address.startsWith("data:"))).toEqual([]);
  // The file is let go once its last page is drawn.
  await expect.poll(() => errors).toEqual([]);
  await frame.waitForTimeout(200);
  expect(errors).toEqual([]);
  await page.close();
});

it("draws a PDF's links as nothing to press: no anchor, and the file's scripts never run", async () => {
  const { frame, hand, page } = await drawn(browser, "viewers/pdf.html");
  const dialogs: string[] = [];
  page.on("dialog", (dialog) => { dialogs.push(dialog.message()); void dialog.dismiss(); });
  await hand(pdfFile([{ lines: ["Open the report"], link: "javascript:parent.postMessage({cx:'ask'},'*')" }], { opens: "app.alert('opened')" }));
  await frame.waitForFunction(() => document.querySelectorAll("#file img").length === 1);
  expect(await frame.$$eval("#file *", (all) => all.map((one) => one.tagName))).toEqual(["IMG"]);
  expect(await frame.$$eval("a, [onclick], [href]", (all) => all.length)).toBe(0);
  expect(dialogs).toEqual([]);
  await page.close();
});

it.each([["en", "This file can't be read."], ["zh", "无法读取此文件。"]])("says in %s that a file which is not a PDF cannot be read, and drops what was drawn", async (locale, line) => {
  const { frame, hand, page } = await drawn(browser, "viewers/pdf.html", locale);
  await hand(pdfFile([{ lines: ["First"] }]));
  await frame.waitForFunction(() => document.querySelectorAll("#file img").length === 1);
  await hand(Buffer.from("PK\u0003\u0004 not a PDF at all").toString("base64"));
  await frame.waitForFunction(() => document.querySelector("#file [role=status]") !== null);
  expect(await frame.$eval("#file", (box) => [box.children.length, box.textContent])).toEqual([1, line]);
  await page.close();
});

/** Stands in, inside the drawn page, for one way a page fails: its drawing refused, or its picture not made. Counts the loading tasks let go. */
const failing = (frame: import("playwright-core").Frame, how: { readonly render?: number; readonly picture?: number }) => frame.evaluate(({ render, picture }) => {
  const scope = window as unknown as { pdfjsLib: { getDocument: (spec: unknown) => { promise: Promise<{ getPage: (n: number) => Promise<{ render: (spec: unknown) => { promise: Promise<void> } }> }>; destroy: () => Promise<void> } }; letGo: number };
  const library = scope.pdfjsLib, open = library.getDocument.bind(library);
  scope.letGo = 0;
  library.getDocument = (spec) => {
    const task = open(spec), destroy = task.destroy.bind(task);
    task.destroy = () => { scope.letGo++; return destroy(); };
    void task.promise.then((pdf) => {
      const get = pdf.getPage.bind(pdf);
      pdf.getPage = async (n) => {
        const page = await get(n);
        if (n === render) page.render = () => ({ promise: Promise.reject(new Error("refused")) });
        return page;
      };
    }, () => undefined);
    return task;
  };
  let pictures = 0;
  const make = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function (done, ...rest) { if (++pictures === picture) done(null); else make.call(this, done, ...rest); };
}, how);

it.each<[string, number | undefined, { readonly render?: number; readonly picture?: number }]>([
  ["a page that cannot be had", 2, {}],
  ["a page whose drawing is refused", undefined, { render: 2 }],
  ["a page whose picture cannot be made", undefined, { picture: 2 }],
])("shows the one line, and none of the pages, for a PDF that opens with %s; the file is let go", async (_, broken, how) => {
  const { frame, hand, page } = await drawn(browser, "viewers/pdf.html");
  await failing(frame, how);
  await hand(pdfFile([1, 2, 3].map((n) => ({ lines: [`Page ${n}`], broken: n === broken }))));
  await frame.waitForFunction(() => document.querySelector("#file [role=status]") !== null);
  expect(await frame.$eval("#file", (box) => [box.children.length, box.querySelectorAll("img").length, box.textContent])).toEqual([1, 0, "This file can't be read."]);
  await expect.poll(() => frame.evaluate(() => (window as unknown as { letGo: number }).letGo)).toBe(1);
  await page.close();
});

it("lets go of a file that cannot be opened", async () => {
  const { frame, hand, page } = await drawn(browser, "viewers/pdf.html");
  await failing(frame, {});
  await hand(Buffer.from("not a PDF").toString("base64"));
  await frame.waitForFunction(() => document.querySelector("#file [role=status]") !== null);
  await expect.poll(() => frame.evaluate(() => (window as unknown as { letGo: number }).letGo)).toBe(1);
  await page.close();
});
