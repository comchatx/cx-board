import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Window, type Document, type HTMLButtonElement, type HTMLElement } from "happy-dom";
import { afterEach, expect, it } from "vitest";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const css = readFileSync(join(ROOT, "kit", "kit.css"), "utf8");
const js = readFileSync(join(ROOT, "kit", "kit.js"), "utf8");
const theme = JSON.parse(readFileSync(join(ROOT, "kit", "theme.json"), "utf8")) as Record<string, string>;
const names = Object.keys(theme).filter((name) => name.startsWith("--"));
const windows: Window[] = [];
afterEach(async () => { for (const window of windows.splice(0)) await window.happyDOM.close(); });

// The platform's part: a value for every name the kit reads, on the page's root. Each is a length, so a rule that reads one shows.
const values = `:root { ${names.map((name, at) => `${name}: ${at + 1}px;`).join(" ")} }`;

// A page of its own: plain tags, and classes a page may well use for itself, under the dark theme.
const plain = `<h1>Restock</h1><p class="row">A <a href="#x">link</a> and <code>x</code>.</p><button>Plain</button><button class="primary">Go</button>
<input class="entry-field"><div class="markdown"><table><tr><th>A</th><td>1</td></tr></table></div><article class="entry"><p class="entry-meta">07:48</p></article>
<ul class="kit-files"><li>a.csv</li></ul><span class="icon">i</span>`;

type Kit = { chart: (spec: unknown) => HTMLElement; timeline: (spec: unknown) => HTMLElement; views: (spec: unknown) => HTMLElement };

function page(body: string, bodyClass = ""): { window: Window; document: Document; load: () => Kit } {
  const window = new Window({ url: "https://pages.invalid/" });
  windows.push(window);
  const document = window.document;
  document.write(`<!doctype html><html lang="en" data-theme="dark"><head><style>${values}</style><style>${css}</style></head><body class="${bodyClass}">${body}</body></html>`);
  // The board inlines the script before the page's code; here it runs with the page's window as its globals.
  const load = () => { new Function("window", `with (window) { ${js} }`)(window); return (window as unknown as { Kit: Kit }).Kit; };
  return { window, document, load };
}

const PROPERTIES = ["color", "background-color", "font-family", "font-size", "font-weight", "line-height", "padding-top", "padding-left", "margin-top", "border-top-width", "border-top-color", "border-top-left-radius", "display", "box-sizing", "outline-style", "width", "height"];
function look(window: Window, document: Document): string[] {
  return [...document.querySelectorAll("html, body, body *")].map((element) => {
    const style = window.getComputedStyle(element as never);
    return `${element.tagName}.${element.className} ${PROPERTIES.map((name) => `${name}=${style.getPropertyValue(name)}`).join(" ")}`;
  });
}

it("leaves a page that does not take the kit as it was written: its markup, its attributes and its look, with the kit's sheet and script both in", () => {
  const bare = page(plain);
  bare.document.querySelectorAll("style")[1]!.remove();
  const before = { markup: bare.document.documentElement.outerHTML, look: look(bare.window, bare.document) };

  const withKit = page(plain);
  const lookWithSheet = look(withKit.window, withKit.document);
  withKit.load();
  // Only the kit's own stylesheet differs between the two documents.
  expect(withKit.document.documentElement.outerHTML.replace(/<style>[\s\S]*?<\/style>/g, "")).toBe(before.markup.replace(/<style>[\s\S]*?<\/style>/g, ""));
  expect(lookWithSheet).toEqual(before.look);
  expect(look(withKit.window, withKit.document)).toEqual(before.look);
  withKit.document.querySelector("button")!.dispatchEvent(new withKit.window.Event("mouseenter") as never);
  withKit.window.dispatchEvent(new withKit.window.Event("scroll") as never);
  expect(withKit.document.querySelector(".cx-tip")).toBeNull();
});

it("draws the same markup in the kit's look once the page takes it by class=\"kit\" on its body", () => {
  const bare = page(plain);
  const kit = page(plain, "kit");
  const button = (document: Document, window: Window) => window.getComputedStyle(document.querySelector("button") as never);
  // `--radius` is set to its place in the list, in px.
  expect(button(kit.document, kit.window).getPropertyValue("border-top-left-radius")).toBe(`${names.indexOf("--radius") + 1}px`);
  expect(button(bare.document, bare.window).getPropertyValue("border-top-left-radius")).not.toBe(button(kit.document, kit.window).getPropertyValue("border-top-left-radius"));
});

it("gives the chart's bars and the timeline's rows one Tab stop each, the arrows between them, and the label of the one the keyboard is on", () => {
  const { window, document, load } = page("", "kit");
  const Kit = load();
  const picked: string[] = [];
  const chart = Kit.chart({ label: "c", most: 10, scale: ["10", "0"], bars: [{ name: "a", figure: "1", value: 1 }, { name: "b", figure: "2", value: 2 }, { name: "c", figure: "3", value: 3 }] });
  const timeline = Kit.timeline({ label: "t", hours: [{ at: 0, words: "6" }], spans: [{ id: "x", name: "x", from: 0, to: 0.5, words: "one" }, { id: "y", name: "y", from: 0.5, to: 1, state: "failed", words: "two" }], pick: (id: string) => picked.push(id) });
  document.body.append(chart, timeline);
  const bars = [...chart.querySelectorAll("button")] as HTMLButtonElement[];
  const spans = [...timeline.querySelectorAll("button")] as HTMLButtonElement[];
  expect(bars.map((bar) => bar.tabIndex)).toEqual([0, -1, -1]);
  expect(spans.map((span) => span.tabIndex)).toEqual([0, -1]);
  expect(bars.map((bar) => bar.getAttribute("aria-label"))).toEqual(["a, 1", "b, 2", "c, 3"]);

  const press = (target: HTMLElement, key: string) => target.dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }) as never);
  bars[0]!.focus();
  press(bars[0]!, "ArrowRight");
  expect(document.activeElement).toBe(bars[1]);
  expect(bars.map((bar) => bar.tabIndex)).toEqual([-1, 0, -1]);
  press(bars[1]!, "End");
  expect(document.activeElement).toBe(bars[2]);
  press(bars[2]!, "ArrowRight");
  expect(document.activeElement).toBe(bars[2]);
  press(bars[2]!, "ArrowDown");
  expect(document.activeElement).toBe(bars[2]);

  spans[0]!.focus();
  press(spans[0]!, "ArrowDown");
  expect(document.activeElement).toBe(spans[1]);
  spans[1]!.click();
  expect(picked).toEqual(["y"]);

  bars[0]!.dispatchEvent(new window.Event("mouseenter") as never);
  const tip = document.querySelector(".cx-tip") as HTMLElement;
  expect(tip.textContent).toBe("a, 1");
  expect(tip.hidden).toBe(false);
  bars[0]!.dispatchEvent(new window.Event("mouseleave") as never);
  expect(tip.hidden).toBe(true);

  const one = () => Kit.chart({ label: "c", most: 1, scale: ["1", "0"], bars: [{ name: "a", figure: "1", value: 1 }] }).querySelector("button")!.getAttribute("aria-label");
  document.documentElement.lang = "zh-CN";
  expect(one()).toBe("a，1");
  // The board's `data-locale` wins over the page's own `lang`.
  document.documentElement.dataset.locale = "en";
  expect(one()).toBe("a, 1");
  document.documentElement.lang = "en";
  document.documentElement.dataset.locale = "zh";
  expect(one()).toBe("a，1");
});

it("draws a file as a message names one, and given its path a button that carries it for the board's own script, hearing no press itself", () => {
  const { window, load } = page("");
  const Kit = load() as unknown as { file: (name: string, path?: string) => HTMLElement };
  const named = Kit.file("sales.csv");
  expect([named.tagName, named.getAttribute("data-cx-file"), named.textContent]).toEqual(["SPAN", null, "sales.csv"]);
  const pressed: unknown[] = [];
  (window as unknown as { cxBoard: unknown }).cxBoard = { open: (path: string) => pressed.push(path) };
  const box = Kit.file("sales.csv", "reports/sales.csv");
  expect([box.tagName, box.getAttribute("type"), box.getAttribute("data-cx-file"), box.className, box.textContent]).toEqual(["BUTTON", "button", "reports/sales.csv", "file-ref", "sales.csv"]);
  (box as unknown as HTMLButtonElement).click();
  expect(pressed).toEqual([]);
});

it("draws a file's kind mark, and beside it the board's mark where a press opens it, hidden at rest; the rule that swaps them under the pointer or the keyboard is read as written", () => {
  const { window, document, load } = page("", "kit");
  const Kit = load() as unknown as { file: (name: string, path?: string) => HTMLElement };
  const paths = (box: HTMLElement, kind: string) => [...box.querySelectorAll(`.mark > .${kind} path`)].map((one) => one.getAttribute("d"));
  const table = Kit.file("sales.CSV", "reports/sales.CSV");
  const plain = Kit.file("notes.docx", "notes.docx");
  const named = Kit.file("sales.csv");
  document.body.append(table, plain, named);
  expect(paths(table, "of-kind")).toContain("M9.5 11.5h6v6h-6z");
  expect(paths(plain, "of-kind")).toEqual(["M7 3.5h7l4 4v13H7z", "M14 3.5v4h4"]);
  expect(paths(table, "to-board")).toContain("M9 3.5h6v3H9z");
  // A file a press does not open keeps its kind's mark alone.
  expect(named.querySelectorAll(".to-board").length).toBe(0);
  const seen = (box: HTMLElement) => ["of-kind", "to-board"].map((kind) => window.getComputedStyle(box.querySelector(`.mark > .${kind}`) as never).visibility);
  expect(seen(table).map((one) => one === "hidden")).toEqual([false, true]);
  expect(css).toContain(":where(.kit) button.file-ref:is(:hover, :focus-visible) .mark > .of-kind { visibility: hidden; }");
  expect(css).toContain(":where(.kit) button.file-ref:is(:hover, :focus-visible) .mark > .to-board { visibility: visible; }");
});

it("draws views with one pill, placed at the offset and width the view shown is given, selection and focus following a press and a key; the pill's --held and its raised fallback are read as written", () => {
  type Views = { views: (spec: unknown) => HTMLElement };
  const shownTo: string[] = [];
  const draw = () => {
    const { window, document, load } = page("", "kit");
    const box = (load() as unknown as Views).views({ label: "Views", views: [{ id: "a", words: "Days" }, { id: "b", words: "Weeks" }, { id: "c", words: "Months" }], shown: "b", change: (id: string) => shownTo.push(id) });
    document.body.append(box);
    return { window, box, pill: box.querySelector(".board-pill") as HTMLElement, tabs: [...box.querySelectorAll<HTMLButtonElement>(".board-view")] };
  };
  const { window, box, pill, tabs } = draw();
  expect([pill.getAttribute("aria-hidden"), box.firstElementChild]).toEqual(["true", pill]);
  expect(tabs.map((tab) => [tab.getAttribute("aria-selected"), tab.tabIndex])).toEqual([["false", -1], ["true", 0], ["false", -1]]);
  tabs.forEach((tab, n) => { Object.defineProperty(tab, "offsetLeft", { value: 4 + 60 * n }); Object.defineProperty(tab, "offsetWidth", { value: 56 }); });
  tabs[2]!.click();
  expect([pill.getAttribute("style"), box.getAttribute("data-still")]).toEqual(["--kit-x:124px;--kit-w:56px", "false"]);
  tabs[2]!.focus();
  tabs[2]!.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Home", bubbles: true }) as never);
  expect([pill.getAttribute("style"), window.document.activeElement]).toEqual(["--kit-x:4px;--kit-w:56px", tabs[0]]);
  expect(shownTo).toEqual(["b", "c", "a"]);
  // The pill is --held, and under a platform that hands none yet the raised ground: a fallback a browser takes and happy-dom does not
  // resolve, so the rule is read as written.
  expect(css).toContain("background: var(--held, var(--raised));");
});

it("takes a file's mark from its path's last part where it is given one, the name staying the seller's words", () => {
  const { load } = page("", "kit");
  const Kit = load() as unknown as { file: (name: string, path?: string) => HTMLElement };
  const kind = (box: HTMLElement) => [...box.querySelectorAll(".mark > .of-kind path")].map((one) => one.getAttribute("d"));
  const sales = Kit.file("Sales", "reports/sales.csv"), other = Kit.file("notes.md", "reports/w46.png"), table = Kit.file("sales.csv");
  expect([kind(sales), sales.textContent]).toEqual([kind(table), "Sales"]);
  expect(kind(other)).toEqual(kind(Kit.file("w46.png")));
  expect(kind(other)).not.toEqual(kind(Kit.file("notes.md")));
});

it("selects no view and draws no pill for a view shown that none of the views is, and hands that id on, as 0.3.12 did", () => {
  const { document, load } = page("", "kit");
  const shownTo: string[] = [];
  const box = (load() as unknown as { views: (spec: unknown) => HTMLElement }).views({ label: "Views", views: [{ id: "a", words: "Days" }, { id: "b", words: "Weeks" }], shown: "gone", change: (id: string) => shownTo.push(id) });
  document.body.append(box);
  const tabs = [...box.querySelectorAll<HTMLButtonElement>(".board-view")];
  expect([tabs.map((tab) => [tab.getAttribute("aria-selected"), tab.tabIndex]), (box.querySelector(".board-pill") as HTMLElement).hidden, shownTo]).toEqual([[["false", -1], ["false", -1]], true, ["gone"]]);
  tabs[1]!.click();
  expect([tabs.map((tab) => tab.getAttribute("aria-selected")), (box.querySelector(".board-pill") as HTMLElement).hidden, shownTo]).toEqual([["false", "true"], false, ["gone", "b"]]);
  expect(css).toContain(":where(.kit) .board-pill[hidden] { display: none; }");
});

type Asked = { form: unknown; words: unknown; under?: HTMLElement; answer: (value: unknown) => void };
const WORDS = {
  other: "Another answer", otherTo: (question: string) => `Another answer to ${question}`, submit: "Submit", next: "Next question", previous: "Previous question",
  position: (n: number, total: number) => `${n} of ${total}`, positionSaid: (n: number, total: number) => `Question ${n} of ${total}:`, skip: "Skip", yes: "Yes", no: "No",
};
const SHIP = { words: "How should the restock go?", options: [{ name: "By sea", line: "About 30 days" }, { name: "By air" }] };
const BOXES = { words: "Which colours?", several: true, options: [{ name: "Blue" }, { name: "Red" }, { name: "Green" }] };
function asking(form: unknown, under?: (document: Document) => HTMLElement) {
  const { window, document, load } = page("", "kit");
  const Kit = load() as unknown as { questions: (spec: Asked) => HTMLElement };
  const said: unknown[] = [];
  const box = Kit.questions({ form, words: WORDS, ...(under === undefined ? {} : { under: under(document) }), answer: (value) => said.push(value) });
  document.body.append(box);
  const press = (selector: string) => (box.querySelector(selector) as HTMLButtonElement).click();
  const named = (name: string) => [...box.querySelectorAll("button")].find((one) => one.textContent === name) as HTMLButtonElement | undefined;
  const pick = (at: number) => { const input = box.querySelectorAll(".kit-option > input")[at] as unknown as { checked: boolean; dispatchEvent: (event: unknown) => void }; input.checked = !input.checked; input.dispatchEvent(new window.Event("change")); };
  return { window, document, box, said, press, named, pick };
}

it("asks one question as the chat's option card does, the page's words on it, and hands the choice in the platform's form once, taking no press after", () => {
  const one = asking({ form: "comchatx.options/1", ask: "ship", questions: [SHIP] }, (document) => Object.assign(document.createElement("p"), { className: "entry-meta", textContent: "07:48" }));
  expect(one.box.querySelector("h3.entry-title")?.textContent).toBe(SHIP.words);
  expect(one.box.children[1]?.textContent).toBe("07:48");
  expect(one.box.querySelector(".kit-options")?.getAttribute("role")).toBe("radiogroup");
  expect([...one.box.querySelectorAll(".kit-option")].map((row) => row.textContent)).toEqual(["By seaAbout 30 days", "By air", "Another answer"]);
  expect([...one.box.querySelectorAll(".kit-option > input")].map((input) => input.getAttribute("type"))).toEqual(["radio", "radio", "radio"]);
  // One question: no place among several and no 跳过; the press that sends waits for a choice.
  expect([one.box.querySelector(".kit-pager"), one.named("Skip")]).toEqual([null, undefined]);
  expect(one.named("Submit")?.disabled).toBe(true);
  one.pick(1);
  expect(one.named("Submit")?.disabled).toBe(false);
  one.named("Submit")!.click();
  expect(one.said).toEqual([{ form: "comchatx.options/1", answers: [{ chosen: ["By air"] }] }]);
  expect([...one.box.querySelectorAll("button, input")].every((control) => (control as HTMLButtonElement).disabled)).toBe(true);
  one.named("Submit")!.click();
  expect(one.said).toHaveLength(1);
});

it("takes the seller's own words in a field under its row, sent on Enter, and boxes where several may be chosen, in the options' order", () => {
  const own = asking({ form: "comchatx.options/1", ask: "ship", questions: [SHIP] });
  own.pick(2);
  const field = own.box.querySelector(".kit-option-own > input.entry-field") as unknown as { value: string; getAttribute: (name: string) => string | null; dispatchEvent: (event: unknown) => void };
  expect(field.getAttribute("aria-label")).toBe(`Another answer to ${SHIP.words}`);
  expect(own.document.activeElement).toBe(field);
  expect(own.named("Submit")?.disabled).toBe(true);
  field.value = "  Rail  ";
  field.dispatchEvent(new own.window.Event("input"));
  expect(own.named("Submit")?.disabled).toBe(false);
  field.dispatchEvent(new own.window.KeyboardEvent("keydown", { key: "Enter" }));
  expect(own.said).toEqual([{ form: "comchatx.options/1", answers: [{ chosen: [], own: "Rail" }] }]);

  const boxes = asking({ form: "comchatx.options/1", ask: "colours", questions: [{ ...BOXES, own: false }] });
  expect(boxes.box.querySelector(".kit-options")?.getAttribute("role")).toBe("group");
  expect([...boxes.box.querySelectorAll(".kit-option > input")].map((input) => input.getAttribute("type"))).toEqual(["checkbox", "checkbox", "checkbox"]);
  boxes.pick(2); boxes.pick(0); boxes.pick(1); boxes.pick(1);
  boxes.named("Submit")!.click();
  expect(boxes.said).toEqual([{ form: "comchatx.options/1", answers: [{ chosen: ["Blue", "Green"] }] }]);
});

it("asks several questions one at a time with its place among them, 跳过 at the foot, and keeps each choice as the seller steps back and on", () => {
  const four = asking({ form: "comchatx.options/1", ask: "plan", questions: [SHIP, BOXES, { words: "When?", options: [{ name: "Today" }, { name: "Monday" }] }, { words: "Tell the supplier?", options: [{ name: "Yes" }, { name: "Not yet" }] }] });
  const title = () => four.box.querySelector("h3.entry-title")?.textContent;
  expect(title()).toBe(`Question 1 of 4: ${SHIP.words}`);
  expect(four.box.querySelector(".kit-pager")?.textContent).toBe("1 of 4");
  expect([...four.box.querySelectorAll(".kit-step")].map((step) => [step.getAttribute("aria-label"), (step as HTMLButtonElement).disabled])).toEqual([["Previous question", true], ["Next question", false]]);
  expect(four.named("Next question")?.disabled).toBe(true);
  four.pick(0);
  four.named("Next question")!.click();
  expect(title()).toBe(`Question 2 of 4: ${BOXES.words}`);
  expect(four.document.activeElement?.getAttribute("data-focus")).toBe("o0");
  four.pick(1);
  four.press('.kit-step[data-focus="previous"]');
  expect((four.box.querySelectorAll(".kit-option > input")[0] as unknown as { checked: boolean }).checked).toBe(true);
  four.press('.kit-step[data-focus="next"]');
  expect((four.box.querySelectorAll(".kit-option > input")[1] as unknown as { checked: boolean }).checked).toBe(true);
  four.named("Next question")!.click();
  four.named("Skip")!.click();
  expect(title()).toBe("Question 4 of 4: Tell the supplier?");
  expect(four.named("Submit")).toBeDefined();
  four.named("Skip")!.click();
  expect(four.said).toEqual([{ form: "comchatx.options/1", answers: [{ chosen: ["By sea"] }, { chosen: ["Red"] }, null, null] }]);
});

it("asks a proposal for a yes or a no, its message under the page's line, and hands on which", () => {
  const yes = asking({ form: "comchatx.confirm/1", ask: "price", title: "Lower the blue kettle to $24.99?", message: "About 7 days of stock at that price." });
  expect(yes.box.querySelector("h3.entry-title")?.textContent).toBe("Lower the blue kettle to $24.99?");
  expect(yes.box.querySelector(".kit-asked-message")?.textContent).toBe("About 7 days of stock at that price.");
  expect([...yes.box.querySelectorAll(".kit-asked-foot > button")].map((one) => [one.textContent, one.className])).toEqual([["No", ""], ["Yes", "primary"]]);
  yes.named("Yes")!.click();
  expect(yes.said).toEqual([{ form: "comchatx.confirm/1", confirmed: true }]);
  const no = asking({ form: "comchatx.confirm/1", ask: "price", title: "Lower it?" });
  expect(no.box.querySelector(".kit-asked-message")).toBeNull();
  no.named("No")!.click();
  expect(no.said).toEqual([{ form: "comchatx.confirm/1", confirmed: false }]);
});

// The board's asks as a page sees them: whether a chat takes a quote, and the quotes asked for.
function quoting(window: Window, quote = true): { quoted: unknown[]; context: { quote: boolean } } {
  const quoted: unknown[] = [], context = { quote };
  (window as unknown as { cxBoard: unknown }).cxBoard = { get context() { return context; }, on: () => {}, quote: async (given: unknown) => { quoted.push(given); return "quoted"; } };
  return { quoted, context };
}
function choose(window: Window, document: Document, node: { textContent: string | null }, from = 0, to = (node.textContent ?? "").length): void {
  const range = document.createRange();
  range.setStart(node as never, from); range.setEnd(node as never, to);
  const selection = window.getSelection()!;
  selection.removeAllRanges(); selection.addRange(range);
  document.dispatchEvent(new window.Event("selectionchange") as never);
}
const settle = (window: Window) => new Promise<void>((done) => window.requestAnimationFrame(() => done()));
const card = `<article class="entry" data-file="inbox/restock.md"><h3 class="entry-title">Restock the yoga mat</h3><div class="entry-body"><p id="w">Order 400 units   before Friday.</p></div></article>
<p id="out">Words outside any card.</p><input id="field" value="typed words">`;

it("floats the chat's 引用 over words selected on a kit page, and quotes them from the card that names its file", async () => {
  const { window, document, load } = page(card, "kit");
  document.documentElement.dataset.locale = "zh";
  const { quoted } = quoting(window);
  load();
  choose(window, document, document.getElementById("w")!.firstChild!);
  await settle(window);
  const pick = document.querySelector(".kit-quote-pick") as unknown as HTMLButtonElement;
  expect(pick.hidden).toBe(false);
  expect(pick.textContent).toBe("引用");
  expect(pick.getAttribute("aria-label")).toBe("引用选中的文字");
  expect(pick.tabIndex).toBe(-1);
  pick.click();
  expect(quoted).toEqual([{ text: "Order 400 units before Friday.", card: "inbox/restock.md", title: "Restock the yoga mat" }]);
  expect(window.getSelection()!.isCollapsed).toBe(true);
  expect(pick.hidden).toBe(true);

  choose(window, document, document.getElementById("out")!.firstChild!, 0, 5);
  await settle(window);
  document.documentElement.dataset.locale = "en";
  choose(window, document, document.getElementById("out")!.firstChild!, 0, 5);
  await settle(window);
  expect(pick.textContent).toBe("Quote");
  pick.click();
  expect(quoted[1]).toEqual({ text: "Words" });
});

it("names a card only when it holds the whole selection: words run from one card into the next are the page's, either way they are selected", async () => {
  const { window, document, load } = page(`<article class="entry" data-file="inbox/a.md"><h3 class="entry-title">First card</h3><p id="a">Words of the first.</p></article>
<article class="entry" data-file="inbox/b.md"><h3 class="entry-title">Second card</h3><p id="b">Words of the second.</p></article>`, "kit");
  const { quoted } = quoting(window);
  load();
  const a = document.getElementById("a")!.firstChild!, b = document.getElementById("b")!.firstChild!;
  const pick = () => document.querySelector(".kit-quote-pick") as unknown as HTMLButtonElement;
  const across = async (anchor: unknown, at: number, focus: unknown, to: number) => {
    window.getSelection()!.setBaseAndExtent(anchor as never, at, focus as never, to);
    document.dispatchEvent(new window.Event("selectionchange") as never);
    await settle(window);
    pick().click();
  };
  await across(a, 0, b, 5);
  await across(b, 5, a, 0);
  await across(b, 20, b, 9);
  expect(quoted).toEqual([
    { text: "Words of the first. Second cardWords" },
    { text: "Words of the first. Second cardWords" },
    { text: "the second.", card: "inbox/b.md", title: "Second card" },
  ]);
});

it("quotes the words selected and the card's title whole past the board's bound: the platform, not the kit, refuses a longer quote", async () => {
  const long = "再订一批货，周五前到。 ".repeat(1200).trim(), named = "Restock ".repeat(15).trim();
  const { window, document, load } = page(`<article class="entry" data-file="inbox/long.md"><h3 class="entry-title">${named}</h3><p id="w">${long}</p></article>`, "kit");
  const { quoted } = quoting(window);
  load();
  choose(window, document, document.getElementById("w")!.firstChild!);
  await settle(window);
  (document.querySelector(".kit-quote-pick") as unknown as HTMLButtonElement).click();
  expect(new TextEncoder().encode(long + named).length).toBeGreaterThan(32 * 1024);
  expect(quoted).toEqual([{ text: long, card: "inbox/long.md", title: named }]);
});

it("floats no 引用 where no chat takes a quote, over a field, or after Escape, which leaves the words selected", async () => {
  const { window, document, load } = page(card, "kit");
  const { quoted, context } = quoting(window, false);
  load();
  const words = document.getElementById("w")!.firstChild!;
  choose(window, document, words);
  await settle(window);
  expect(document.querySelector(".kit-quote-pick:not([hidden])")).toBeNull();

  context.quote = true;
  choose(window, document, document.getElementById("field")!);
  await settle(window);
  expect(document.querySelector(".kit-quote-pick:not([hidden])")).toBeNull();

  choose(window, document, words);
  await settle(window);
  expect(document.querySelector(".kit-quote-pick:not([hidden])")).not.toBeNull();
  document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" }) as never);
  expect(document.querySelector(".kit-quote-pick:not([hidden])")).toBeNull();
  expect(window.getSelection()!.toString()).toBe("Order 400 units   before Friday.");
  expect(quoted).toEqual([]);
});

it("draws nothing over a selection on a page that does not take the kit by its class, even where the board gives a quote", async () => {
  const { window, document, load } = page(card);
  quoting(window);
  load();
  choose(window, document, document.getElementById("w")!.firstChild!);
  await settle(window);
  expect(document.querySelector(".kit-quote-pick")).toBeNull();
});
