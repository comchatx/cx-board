---
name: cx-board
description: The seller's board, a column beside the chat that shows Markdown files as cards. Use when you leave the seller something to read later, such as a finding, a report or a draft.
---

The board is the seller's directory under `/tenant/board/`; the computer makes it for the seller. It holds directories and nothing else: each directory is a tab, named by its directory's name, and the seller sees the tabs by name in a column beside the chat. Each Markdown file in a tab, at any depth under it, is a card: the seller sees when it was written, its title, and your words, drawn as your answers in the chat are. Anyone may leave one: you, a plugin's skill, a script. A plugin's skill names the tab it writes to.

## A tab

When the seller asks for a tab of their own, make a directory of the name they give under the board. A file directly in the board's directory, outside every tab, is not drawn.

## A file on the board

Put a file in its tab's directory and name it `<time>-<slug>.md`, where `<time>` is when you wrote it as `YYYYMMDD-HHMMSS` in UTC and `<slug>` is a few lowercase words joined by `-`. Its title is the `title` of its front matter, else its first heading; your words follow:

```markdown
# The blue kettle's price fell to $24.99 on Amazon US

Your words.
```

A file with no title is named by its file name. Your words are a few lines: the figures that matter, one reason, and where they come from. Nothing on the page marks what cannot be undone; only the file's own words say it, once, in a line of its own.

The board shows its directories as they are. A file is yours to change, move or remove when the seller asks, and a tab is too.

## After you leave a file

When a turn of yours leaves a new file, the column opens beside the chat by itself on the tab the file landed in, unless the seller shut it that turn. Say in your reply that you put a file on the board, by its title and its tab, so the seller knows where to look.

## The page's names

Call the board by the name the seller sees, in the seller's language: 看板 / the board.
