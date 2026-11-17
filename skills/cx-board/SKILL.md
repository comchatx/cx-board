---
name: cx-board
description: The seller's board, a column beside the chat that shows Markdown files as cards, or a board's page in their place. Use when the seller asks for something to be put, changed or found on the board, or when another plugin's skill names the board.
---

The board is the seller's directory under `/tenant/board/`; the computer makes it for the seller. Where several people share a computer, each has a board of their own, and yours is `/tenant/board/<person>/`, `<person>` being the account the board is drawn for. It holds directories and nothing else: each directory is a tab, named by its directory's name, and the seller sees the tabs by name in a column beside the chat. Each Markdown file in a tab, at any depth under it, is a card: the seller sees when it was written, its title, and your words. In a tab the board draws itself, your words are drawn as your answers in the chat are; a tab a plugin draws with a page of its own, such as the Inbox, draws them as that plugin's skill says. Anyone may leave one: you, a plugin's skill, a script. A plugin's skill names the tab it writes to.

## A tab

When the seller asks for a tab of their own, make a directory of the name they give under the board. A file directly in the board's directory, outside every tab, is not drawn.

## A file on the board

A file sits in its tab's directory, named `<time>-<slug>.md`, where `<time>` is when it was written as `YYYYMMDD-HHMMSS` in UTC and `<slug>` is a few lowercase words joined by `-`. Its title is the `title` of its front matter, else its first heading; your words follow:

```markdown
# The blue kettle's price fell to $24.99 on Amazon US

Your words.
```

A file with no title is named by its file name. The board reads a card's file up to 32 KiB (32,768 bytes); a larger one is drawn by its title alone, with 文件过大，无法显示。 / This file is too large to show. in place of its words. Your words are a few lines: the figures that matter, one reason, and where they come from. Nothing on the page marks what cannot be undone; only the file's own words say it, once, in a line of its own.

The board shows its directories as they are. A file is yours to change, move or remove when the seller asks, and a tab is too.

A file on the board does not hold your turn: the seller reads it when they come to the board. A question asked in the turn, through pi's question box, holds it until the seller answers.

## When a file lands

When a turn of yours leaves a new file, the column opens beside the chat by itself on the tab the file landed in, unless the seller shut it that turn.

## A page

A board whose folder holds `page.html` at its top is drawn as that page in a frame, in place of its cards. Over the frame, the seller sees a row saying cx made it.

The page runs its own script and reaches nothing outside its board: it loads no script, style sheet or image from an address (an image or a sound is drawn from a `data:` address only), fetches nothing from the network, opens no outside address, submits no form and downloads no file. A button that would export a file, or a link out of the page, does nothing there.

A page is at most 1 MiB (1,048,576 bytes), and the data written inline in it counts toward that. A larger `page.html` is not shown: the tab reads 页面没有加载出来。 / This page did not load., and 重试 / Try again meets the same bound. Data kept in files beside the page, in its own board's folder, does not count toward it: the page reads each with `cxBoard.read`, and that is how a page shows more than it can hold inline.

The board checks each bound as it reads, not as a file is written: a file written with a shell command or a script meets none of them until the seller opens the page or the tab.

The board passes the page its theme and language on `<html>`, as `data-theme` (`light` or `dark`) and `data-locale` (`zh` or `en`).

The ready-made elements are in the page before its own code, so a page uses them with no `<link>` or `<script>`. A page takes them by `<body class="kit">`, and is then drawn in the board's look; a page without that class is drawn as it is written. The elements are:

- a card, `<article class="entry">` holding `<p class="entry-meta"><time>`, `<h3 class="entry-title">` and `<div class="markdown entry-body">`;
- a button, `<button>`, `<button class="primary">` for the one that sends, and `disabled`;
- a field, `<input class="entry-field">` or `<textarea class="entry-field">`;
- a table, `<table>` inside `<div class="markdown entry-body bp-table">`, its figures at the end of their cells;
- a count, `<dl class="bp-figures">` of `<div class="bp-figure"><dt>` name `<dd>` figure;
- a heading, `<h2 class="bp-head">`, and a row with one press, `<div class="bp-row">` holding `<div class="bp-words">` (`.bp-name`, `.bp-result`, `.bp-line`) and a `<button>`;
- a list of cards, `<ul class="kit-cards">`, as many across as the width holds; the empty line, `<p class="board-empty">`;
- from `Kit`, the elements' script: `Kit.views({ label, views, shown, change })`, a switch; `Kit.file(name)`, a file as a message names one, in `<ul class="kit-files">` with `<span class="kit-file-when">`; `Kit.chart({ label, bars, most, scale })`, a chart; `Kit.timeline({ label, hours, spans, pick })`, a timeline; `Kit.h(tag, attrs, ...children)` makes an element.

The elements carry no words: every line on the page is the page's, in the language `data-locale` names. `<div class="kit-page">` stacks them down the page. The chart's bars and the timeline's rows are one Tab stop each, the arrows move between them, and the one under the pointer or the keyboard shows its label.

The page reaches the board through `window.cxBoard`, which the board defines:

- `cxBoard.context` is `{ theme: "light" | "dark", locale: "zh" | "en", width }`, `width` in pixels; `cxBoard.on("context", fn)` hears it change, and `cxBoard.on("files", fn)` hears the board's files change.
- `cxBoard.list()` answers a list of `{ file, modified, size }` for the page's own board, at most 2,000 files and 16 folders deep; `cxBoard.read(file)` answers one file's text, at most 1 MiB, and refuses a larger one.
- `cxBoard.draft(text)` puts a sentence in the message box, for the seller to send as their own.
- `cxBoard.send(text)` sends it as the seller's message, or puts it in the message box where it cannot go at that moment.
- A draft and a send each need a press, a click or a key typed inside the page: a press gives one draft or one send, and none within five seconds of the last. Without a press the board refuses it, and the page's code cannot make one.
- `cxBoard.write(file, text)` writes one file in the page's own board, at most 512 KiB (524,288 bytes) as UTF-8, and refuses a larger one; it does not write `page.html`.
- `cxBoard.count(n, words)` puts a number on the board's icon, with the page's words for what it counts.
- `cxBoard.show(name)` asks for the page's board to be opened and shown, `name` saying what changed.

Text is plain; a draft or a sent message is at most 2,000 characters.

## The page's names

Call the board by the name the seller sees, in the seller's language: 看板 / the board.
