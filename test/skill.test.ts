import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const skill = readFileSync(join(ROOT, "skills", "cx-board", "SKILL.md"), "utf8");

it("tells cx of the base alone: a file, its heading, its words and Mark as read, and none of the module's kinds, answers or Send to cx", () => {
  for (const said of ["/tenant/board/", "`todo/`", "`done/`", "Its first line is a heading", "已读 / Mark as read", "done: read"]) expect(skill, said).toContain(said);
  for (const gone of ["kind:", "proposal", "choice", "input", "交给 cx", "忽略", "The seller's answers", "timed_out"]) expect(skill, gone).not.toContain(gone);
});
