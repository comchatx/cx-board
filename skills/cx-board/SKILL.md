---
name: cx-board
description: The seller's board, where you leave something for the seller to read beside the chat. Use when you leave the seller a finding, a change you made or a report to read later.
---

The board is the seller's directory under `/tenant/board/`; the computer makes it for the seller. What waits for the seller is under its `todo/`, and what the seller has done with is under its `done/`. The seller reads the board in a column beside the chat; nothing on it reaches the seller any other way. When a turn of yours leaves a new file on the board, the column may open beside the chat by itself.

## A file on the board

One file is one Markdown file under `todo/`, named `<time>-<slug>.md`, where `<time>` is when you wrote it as `YYYYMMDD-HHMMSS` in UTC and `<slug>` is a few lowercase words joined by `-`. Its first line is a heading, which is the one line the seller reads first; your words for the seller follow, drawn as your answers in the chat are:

```markdown
# The blue kettle's price fell to $24.99 on Amazon US

Your words.
```

The seller sees when the file was written, its heading as its title, and your words. A file with no heading is named by its file name. A Markdown file a plugin writes directly in the seller's board directory waits as one under `todo/` does. A hand-over names such a file `../<name>`, its path from `todo/`; once handed over it sits under `done/` as `<name>`, or `<name>-2`, `-3` when another had the name, as a file from `todo/` does.

Your words are a few lines: the figures that matter, one reason, and where they come from.

Nothing on the page marks what cannot be undone; only the file's own words say it, once, in a line of its own.

## The page's names

Call the board and its parts by the names the seller sees, in the seller's language: 看板 / the board, 待处理 / To do, 已处理 / Done, 已读 / Mark as read.

## What the seller does with a file

**已读 / Mark as read**: the file moves to `done/`. You are not told. A file moved to `done/` keeps every line you wrote and gains front matter with `done: read` and `doneAt`. Nothing on the board is deleted.
