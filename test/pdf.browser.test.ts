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
  const { frame, asked, hand, page } = await drawn(browser, "viewers/pdf.html");
  await hand(pdfFile([{ lines: ["Week 46 sales", "Units 1,284"] }, { chinese: "第46周销售报告" }, { lines: ["Last page"], box: true }]));
  await frame.waitForFunction(() => document.querySelectorAll("#file img").length === 3);
  const sizes = await frame.$$eval("#file img", (pictures) => (pictures as HTMLImageElement[]).map((one) => [Math.round(one.getBoundingClientRect().width), one.naturalWidth > 0]));
  expect(sizes).toEqual([[760, true], [760, true], [760, true]]);
  expect(await inked(frame, 0)).toBeGreaterThan(50);
  expect(await inked(frame, 1)).toBeGreaterThan(50);
  expect(asked.filter((address) => !address.startsWith("blob:") && !address.startsWith("data:"))).toEqual([]);
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
