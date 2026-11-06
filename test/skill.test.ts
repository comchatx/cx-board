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
