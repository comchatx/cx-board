import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const skill = readFileSync(join(ROOT, "skills", "cx-board", "SKILL.md"), "utf8");

it("is used on the two occasions alone: the seller asks for something on the board, or another plugin's skill names it", () => {
  expect(skill).toContain("\ndescription: The seller's board, a column beside the chat that shows Markdown files as cards, or a board's page in their place. Use when the seller asks for something to be put, changed or found on the board, or when another plugin's skill names the board.\n");
  for (const unasked of ["something to read later", "Say in your reply", "Put a file", "When you leave"]) expect(skill, unasked).not.toContain(unasked);
});

it("tells cx of the base alone: where the board is, that a file with a title is a card, and that a new file opens nothing by itself, with none of the module's places, marks, kinds or answers", () => {
  for (const said of ["/tenant/board/", "`title` of its front matter, else its first heading", "the board opens nothing by itself: the tab the file landed in gets a dot until the seller opens it", "A board a plugin draws with a page of its own may ask to be shown", "at any depth under it", "看板 / the board", "each directory is a tab", "make a directory of the name they give"]) expect(skill, said).toContain(said);
  for (const gone of ["todo/", "done/", "已读", "Mark as read", "kind:", "proposal", "choice", "交给 cx", "忽略", "deleted"]) expect(skill, gone).not.toContain(gone);
});

it("tells cx how a page is written: page.html at the board's top, drawn in a frame under a row saying cx made it, loading nothing, built from the elements, and reaching the board through cxBoard", () => {
  for (const said of [
    "`page.html` at its top is drawn as that page in a frame",
    "a row saying cx made it",
    "fetches nothing from the network, opens no outside address, submits no form and downloads no file by itself. A link out of the page does nothing there; a file reaches the seller through `cxBoard.save`.",
    "A page is at most 5 MiB (5,242,880 bytes), and the data written inline in it counts toward that. A larger `page.html` is not shown: the tab reads 页面没有加载出来。 / This page did not load.",
    "the page reads each with `cxBoard.read`, and that is how a page shows more than it can hold inline",
    "a file written with a shell command or a script meets none of them until the seller opens the page or the tab",
    "no `<link>` or `<script>`",
    "A page takes them by `<body class=\"kit\">`", "a page without that class is drawn as it is written",
    "`<article class=\"entry\">`", "`<button class=\"primary\">`", "`<input class=\"entry-field\">`", "`<dl class=\"bp-figures\">`", "`<ul class=\"kit-files\">`", "`<p class=\"board-empty\">`", "`Kit.views(", "`Kit.chart(", "`Kit.timeline(",
    "The elements carry no words",
    "`window.cxBoard`, which the board defines",
    "The board passes the page its theme and language on `<html>`, as `data-theme` (`light` or `dark`) and `data-locale` (`zh` or `en`).",
    "`cxBoard.context` is `{ theme: \"light\" | \"dark\", locale: \"zh\" | \"en\", width }`",
    "`cxBoard.on(\"context\", fn)`", "`cxBoard.on(\"files\", fn)`",
    "`cxBoard.list()` answers a list of `{ file, modified, size }` for the page's own board",
    "at most 2,000 files and 16 folders deep", "`cxBoard.read(file)` answers one file's text, at most 5 MiB, and refuses a larger one",
    "`cxBoard.draft(text)` puts a sentence in the message box",
    "`cxBoard.send(text)` sends it as the seller's message, or puts it in the message box where it cannot go at that moment",
    "A draft, a send and a save each need a press, a click or a key typed inside the page: a press gives one draft, one send or one save, and none within five seconds of the last. Without a press the board refuses it",
    "`cxBoard.markdown(text)` answers the text drawn as your answers in the chat are, as HTML for a `<div class=\"markdown\">`", "The text is at most 32 KiB (32,768 bytes) as UTF-8, and a larger one is refused. It needs no press. A link in it opens nothing in the page.",
    "`cxBoard.save({ name, text })` hands the seller the page's text as a file named `name`; `cxBoard.save({ file })` hands them one file of the page's own board", "It is at most 5 MiB (5,242,880 bytes) as UTF-8, and a larger one is refused; `name` is a file name, with no folder and no leading `.`.",
    "`cxBoard.write(file, text)` writes one file in the page's own board, at most 512 KiB (524,288 bytes) as UTF-8, and refuses a larger one; it does not write `page.html`",
    "`cxBoard.count(n, words)` puts a number on the board's icon, with the page's words",
    "`cxBoard.show(name)` asks for the page's board to be opened and shown",
    "Text is plain; a draft or a sent message is at most 2,000 characters.",
  ]) expect(skill, said).toContain(said);
});

it("tells cx, one sentence each, that a board file does not hold its turn, and which board is its own on a shared computer", () => {
  expect(skill).toContain("A file on the board does not hold your turn: the seller reads it when they come to the board.");
  expect(skill).not.toContain("question box");
  expect(skill).toContain("Where several people share a computer, each has a board of their own, and yours is `/tenant/board/<person>/`, `<person>` being the account the board is drawn for.");
  for (const rule of ["must not", "never ", "do not", "don't"]) expect(skill.toLowerCase(), rule).not.toContain(rule);
});

it("tells cx which tabs draw a card's words as the chat does, and the size the board reads a card's file to", () => {
  expect(skill).toContain("In a tab the board draws itself, your words are drawn as your answers in the chat are; a tab a plugin draws with a page of its own, such as the Inbox, draws them as that plugin's skill says.");
  expect(skill).toContain("The board reads a card's file up to 32 KiB (32,768 bytes); a larger one is drawn by its title alone");
});

it("says how a page gets its height: the frame takes the root's drawn height up to its cap, the board's height may stand under a short page, a root sized to its window reads that window, and a kept height stays until it is read again", () => {
  for (const said of [
    "The frame takes its height from the page: it is as tall as the page's root, `<html>`, is drawn, up to 100,000 px, and the board scrolls it.",
    "A page in ordinary flow is drawn whole up to that height; a taller one scrolls inside itself as well as in the board.",
    "A page shorter than the board may stand in a frame as tall as the board under the row.",
    "A root whose height comes from its window (`height: 100%`, `100vh`, a full-height box that scrolls inside) is drawn at that window's height, which the frame takes: the board's height under the row, or 0, and 0 while the board is closed.",
    "A height the page's code reads from its window and keeps stays as it was read until that code reads it again, at `resize` or after a reload.",
  ]) expect(skill, said).toContain(said);
  expect(skill).not.toContain("at any length");
});

/** The whole page of the skill's example, drawn in happy-dom with the kit's own script, `cxBoard.read` answering `csv`. */
async function drawExample(csv: string) {
  const { Window } = await import("happy-dom");
  const example = /A whole `page.html`[^\n]*\n\n```html\n([\s\S]*?)\n```/.exec(skill)?.[1];
  expect(example).toBeDefined();
  const window = new Window({ settings: { enableJavaScriptEvaluation: true } });
  const read: string[] = [], saved: unknown[] = [], errors: unknown[] = [];
  let ready!: () => void;
  const drawn = new Promise<void>((done) => { ready = done; });
  Object.assign(window, { cxBoard: { read: (file: string) => { read.push(file); return Promise.resolve(csv).finally(() => setTimeout(ready)); }, save: (given: unknown) => { saved.push(given); return Promise.resolve("saved"); } } });
  window.addEventListener("unhandledrejection", (event) => errors.push((event as unknown as { reason: unknown }).reason));
  // The most nodes any one append is handed: a row each, never every row as arguments of one call.
  let most = 0;
  const append = window.Element.prototype.append;
  window.Element.prototype.append = function (this: unknown, ...nodes: unknown[]) { most = Math.max(most, nodes.length); return append.apply(this, nodes as never); };
  window.eval(readFileSync(join(ROOT, "kit", "kit.js"), "utf8"));
  window.document.documentElement.dataset["locale"] = "en";
  window.document.body.className = "kit";
  window.document.body.innerHTML = /<body class="kit">([\s\S]*?)<script>/.exec(example!)![1]!;
  window.eval(/<script>([\s\S]*)<\/script>/.exec(example!)![1]!);
  await drawn;
  return { example: example!, window, document: window.document, read, saved, errors, most };
}

it("gives one whole page to start from, in the kit's elements and its flow: every row of a file beside it read with cxBoard.read, a count, and a press that saves the page's words and one that saves the file, each row appended on its own", async () => {
  const csv = ["SKU,Units", ...Array.from({ length: 3000 }, (_, n) => `B0${n},${n * 3}`)].join("\n");
  const { example, window, document, read, saved, errors, most } = await drawExample(csv);
  expect([errors, most]).toEqual([[], 1]);
  expect(example).toMatch(/^<!doctype html>\n<html>[\s\S]*<\/html>$/);
  expect(example).not.toMatch(/100vh|height:\s*100%|innerHeight|<link|<script src/);
  expect(read).toEqual(["data/orders.csv"]);
  expect(document.querySelectorAll(".kit-page > .bp-head, .kit-page > .bp-figures, .kit-page > .bp-table, .kit-page > .bp-row").length).toBe(5);
  expect([...document.querySelectorAll(".bp-row")].map((row) => [row.querySelector(".bp-words .bp-name") !== null, row.querySelector("button")?.getAttribute("type")])).toEqual([[true, "button"], [true, "button"]]);
  const rows = document.querySelectorAll(".bp-table tbody tr");
  expect(rows.length).toBe(3000);
  expect([0, 1500, 2999].map((at) => [...rows[at]!.querySelectorAll("td")].map((cell) => cell.textContent))).toEqual([["B00", "0"], ["B01500", "4500"], ["B02999", "8997"]]);
  expect([...document.querySelectorAll(".bp-table thead th")].map((cell) => cell.textContent)).toEqual(["SKU", "Units"]);
  expect(document.getElementById("count")?.textContent).toBe("3,000");
  for (const button of document.querySelectorAll(".bp-row button")) (button as unknown as { click: () => void }).click();
  expect(saved).toEqual([{ name: "count.csv", text: "{what the count counts},3000" }, { file: "data/orders.csv" }]);
  await window.happyDOM.close();
});

it("states a card's urgency as one fact of its front matter, three levels, and none that makes a thing urgent", () => {
  expect(skill).toContain("A card may say how urgent it is by `level` in its front matter: `1` is 常规 / Routine, `2` 加急 / Urgent and `3` 特急 / Very urgent. A card without it is 常规 / Routine.");
  expect(skill).toContain("`Kit.questions({ form, words, under, answer })`, questions with options in the platform's form (`comchatx.options/1` or `comchatx.confirm/1`)");
  for (const rule of ["when something is urgent", "use level", "should be urgent"]) expect(skill, rule).not.toContain(rule);
});
