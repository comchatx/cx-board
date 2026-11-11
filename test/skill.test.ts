import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const skill = readFileSync(join(ROOT, "skills", "cx-board", "SKILL.md"), "utf8");

it("tells cx of the base alone: where the board is, that a file with a title is a card, and that cx says so in the chat, with none of the module's places, marks, kinds or answers", () => {
  for (const said of ["/tenant/board/", "`title` of its front matter, else its first heading", "opens beside the chat by itself on the tab the file landed in", "at any depth under it", "看板 / the board", "each directory is a tab", "make a directory of the name they give"]) expect(skill, said).toContain(said);
  for (const gone of ["todo/", "done/", "已读", "Mark as read", "kind:", "proposal", "choice", "交给 cx", "忽略", "deleted"]) expect(skill, gone).not.toContain(gone);
});

it("tells cx how a page is written: page.html at the board's top, drawn in a frame under a row saying cx made it, loading nothing, built from the elements, and reaching the board through cxBoard", () => {
  for (const said of [
    "`page.html` at its top is drawn as that page in a frame",
    "a row saying cx made it",
    "loads nothing from the network",
    "no `<link>` or `<script>`",
    "A page takes them by `<body class=\"kit\">`", "a page without that class is drawn as it is written",
    "`<article class=\"entry\">`", "`<button class=\"primary\">`", "`<input class=\"entry-field\">`", "`<dl class=\"bp-figures\">`", "`<ul class=\"kit-files\">`", "`<p class=\"board-empty\">`", "`Kit.views(", "`Kit.chart(", "`Kit.timeline(",
    "The elements carry no words",
    "`window.cxBoard`, which the board defines",
    "`cxBoard.context` is `{ theme: \"light\" | \"dark\", locale: \"zh\" | \"en\", width }`",
    "`cxBoard.on(\"context\", fn)`", "`cxBoard.on(\"files\", fn)`",
    "`cxBoard.list()` answers a list of `{ file, modified, size }` for the page's own board",
    "`cxBoard.read(file)` answers a file's text, at most 1 MiB",
    "`cxBoard.draft(text)` puts a sentence in the message box",
    "`cxBoard.send(text)` sends it as the seller's message, one for each press inside the page and within a few seconds of it; at any other time it is a draft",
    "`cxBoard.write(file, text)` writes one file in the page's own board",
    "`cxBoard.count(n, words)` puts a number on the board's icon, with the page's words",
    "`cxBoard.show(name)` asks for the page's board to be opened and shown",
    "Text is plain; a draft or a sent message is at most 2,000 characters.",
  ]) expect(skill, said).toContain(said);
});

it("tells cx, one sentence each, that a board file does not hold its turn while pi's question box does, and which board is its own on a shared computer", () => {
  expect(skill).toContain("A file on the board does not hold your turn: the seller reads it when they come to the board. A question asked in the turn, through pi's question box, holds it until the seller answers.");
  expect(skill).toContain("Where several people share a computer, each has a board of their own, and yours is `/tenant/board/<person>/`, `<person>` being the account the board is drawn for.");
  for (const rule of ["must not", "never ", "do not", "don't"]) expect(skill.toLowerCase(), rule).not.toContain(rule);
});
