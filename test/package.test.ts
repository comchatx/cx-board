import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DefaultResourceLoader, SettingsManager } from "@earendil-works/pi-coding-agent";
import { afterEach, expect, it } from "vitest";
import { viewerFiles } from "../scripts/viewers.mjs";
import { githubKit, kitCss } from "../scripts/kit-github.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { pi: unknown; files: unknown; devDependencies: Record<string, string>; comchatx: { skills: Record<string, unknown> } };
const scratches: string[] = [];
afterEach(() => { for (const scratch of scratches.splice(0)) rmSync(scratch, { recursive: true, force: true }); });

const walk = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]));

it("the pinned pi lists the package's skills as its manifest names them, with nothing it could not read", async () => {
  const home = mkdtempSync(join(tmpdir(), "pi-package-"));
  scratches.push(home);
  const agentDir = join(home, "agent");
  const cwd = join(home, "project");
  for (const directory of [agentDir, cwd]) mkdirSync(directory);
  writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ defaultProjectTrust: "always", packages: [ROOT] }));
  const loader = new DefaultResourceLoader({ cwd, agentDir, settingsManager: SettingsManager.create(cwd, agentDir) });
  await loader.reload();
  const { skills, diagnostics } = loader.getSkills();
  expect(diagnostics).toEqual([]);
  expect(manifest.pi).toEqual({ skills: ["./skills"] });
  // The Plugins page names a package's skills from its `comchatx` field alone.
  expect(skills.map((skill) => skill.name).sort()).toEqual(Object.keys(manifest.comchatx.skills).sort());
  for (const skill of skills) expect(skill.description.trim(), skill.name).not.toBe("");
});

it("ships its skills, the page's elements, its viewers, its README in English and in Chinese and its license, and nothing else", () => {
  // npm 12 keys its answer by the package's name; earlier ones answer a list.
  const answer = JSON.parse(execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: ROOT, encoding: "utf8" })) as { files: { path: string }[] }[] | Record<string, { files: { path: string }[] }>;
  const packed = Array.isArray(answer) ? answer : Object.values(answer);
  const skills = walk(join(ROOT, "skills")).map((path) => relative(ROOT, path));
  expect(packed[0]!.files.map((file) => file.path).sort()).toEqual(["LICENSE", "README.md", "README.zh-CN.md", "package.json", "kit/kit.css", "kit/kit.js", "kit/theme.json", "kit/licences/github-markdown-css.txt", "viewers/markdown.html", "viewers/picture.html", "viewers/table.html", "viewers/word.html", "viewers/sheet.html", "viewers/pdf.html", "viewers/licences/mammoth.txt", "viewers/licences/sheetjs.txt", "viewers/licences/pdfjs-dist.txt", "viewers/licences/pdfjs-dist-cmaps.txt", ...skills].sort());
  expect(manifest.files).toEqual(["skills", "kit", "viewers", "!viewers/src", "README.zh-CN.md"]);
});

it("the card's name is comchatx.name, the one signed on 2026-11-11", () => {
  const field = (JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { comchatx: { name?: unknown; nameZh?: unknown } }).comchatx;
  expect(field.name).toBe("Flex Board");
  expect(field.nameZh).toBe("灵动看板");
});

it("holds each assembled viewer page and licence as the script makes it from its source and the pinned library, each page at most 5 MiB", () => {
  const made = viewerFiles();
  expect([...made.keys()].sort()).toEqual(["viewers/licences/mammoth.txt", "viewers/licences/pdfjs-dist-cmaps.txt", "viewers/licences/pdfjs-dist.txt", "viewers/licences/sheetjs.txt", "viewers/pdf.html", "viewers/sheet.html", "viewers/table.html", "viewers/word.html"]);
  for (const [path, text] of made) expect(readFileSync(join(ROOT, path), "utf8") === text, `${path} is not what \`npm run viewers\` makes`).toBe(true);
  for (const path of made.keys()) if (path.endsWith(".html")) expect(Buffer.byteLength(made.get(path)!), path).toBeLessThanOrEqual(5 * 1024 * 1024);
});

it("holds GitHub's Markdown rules in kit/kit.css, and their licence beside it, as the script makes them from the pinned github-markdown-css", () => {
  expect(manifest.devDependencies["github-markdown-css"]).toBe("5.9.0");
  const css = readFileSync(join(ROOT, "kit", "kit.css"), "utf8");
  expect(css === kitCss(css), "kit/kit.css is not what `npm run kit` makes").toBe(true);
  expect(readFileSync(join(ROOT, "kit", "licences", "github-markdown-css.txt"), "utf8")).toBe(githubKit().licence);
  expect(githubKit().licence).toContain("MIT License");
});

it("carries the Excel reader as the one file of SheetJS Community Edition 0.20.3 that DEVELOPING.md names by its sha256", () => {
  const sha = createHash("sha256").update(readFileSync(join(ROOT, "scripts", "sheetjs", "xlsx.mini.min.js"))).digest("hex");
  expect(sha).toBe("0cb353f830d7288385492c83d277b058ddeac664ca51cf1393aa1fd3e2b70939");
  expect(readFileSync(join(ROOT, "DEVELOPING.md"), "utf8")).toContain(sha);
  expect(readdirSync(join(ROOT, "scripts", "sheetjs")).sort()).toEqual(["LICENSE", "xlsx.mini.min.js"]);
});
