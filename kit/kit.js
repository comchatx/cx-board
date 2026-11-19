// The elements' script: what the board puts into a page, after `kit.css` and before the page's own code. It gives the elements that need
// a script, a chart, a timeline, a switch and questions with options, with what a pointer and a keyboard do on them, and a file as a
// message names one. A page reaches all of it through `Kit`. It carries no words: every line it draws is the page's. Nothing here speaks
// across the frame's edge or loads anything. Loading it defines `Kit` and nothing else: it
// touches no element and hears no event until the page makes an element with it, and its rules in `kit.css` hold only under `.kit`.
(() => {
  "use strict";
  const root = document.documentElement;
  // The board names the page's language as `data-locale` on its root, else the page's own `lang` does; Chinese joins a name and its
  // figure with its own comma.
  const zh = () => /^zh\b/i.test(root.dataset.locale || root.lang);
  const join = (a, b) => `${a}${zh() ? "，" : ", "}${b}`;

  function h(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs ?? {})) {
      if (value === undefined || value === null || value === false) continue;
      if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? "" : String(value));
    }
    for (const child of children.flat(Infinity)) if (child !== undefined && child !== null && child !== false) node.append(child);
    return node;
  }
  const SVG = "http://www.w3.org/2000/svg";
  function icon(...paths) {
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("class", "icon"); svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true");
    for (const d of paths) { const path = document.createElementNS(SVG, "path"); path.setAttribute("d", d); svg.append(path); }
    return svg;
  }

  // ---- The label over what the pointer or the keyboard is on, drawn as the board draws its own ----
  const tip = h("div", { class: "cx-tip", hidden: true, "aria-hidden": "true" });
  let tipped;
  let heard = false;
  function showTip(target, words) {
    if (!heard) { heard = true; addEventListener("scroll", () => hideTip(), { passive: true }); }
    if (!tip.isConnected || !tip.parentElement.contains(target)) (target.closest(".kit") ?? document.body).append(tip);
    tipped = target;
    tip.textContent = words;
    tip.hidden = false;
    const at = target.getBoundingClientRect();
    const top = at.top - 6 - tip.offsetHeight;
    tip.style.left = `${Math.max(8, Math.min(at.left, innerWidth - tip.offsetWidth - 8))}px`;
    tip.style.top = `${top < 6 ? at.bottom + 6 : top}px`;
  }
  function hideTip(target) { if (!target || tipped === target) { tipped = undefined; tip.hidden = true; } }
  const byKeyboard = (target) => { try { return target.matches(":focus-visible"); } catch { return false; } };
  function labelled(target, words) {
    target.addEventListener("mouseenter", () => showTip(target, words));
    target.addEventListener("mouseleave", () => hideTip(target));
    target.addEventListener("focus", () => { if (byKeyboard(target)) showTip(target, words); });
    target.addEventListener("blur", () => hideTip(target));
  }

  /** One Tab stop for a row of like things: the arrows named go to the one before and the one after, Home to the first, End to the last. */
  function rove(box, items, back, on) {
    items.forEach((item, at) => { item.tabIndex = at === 0 ? 0 : -1; });
    box.addEventListener("keydown", (event) => {
      const at = items.indexOf(document.activeElement);
      if (at === -1) return;
      const to = { [back]: at - 1, [on]: at + 1, Home: 0, End: items.length - 1 }[event.key];
      if (to === undefined || to < 0 || to >= items.length) return;
      event.preventDefault();
      for (const item of items) item.tabIndex = -1;
      items[to].tabIndex = 0;
      items[to].focus();
    });
  }

  /**
   * A chart of bars. `bars` are `{ name, figure, value }`: the name under the bar, the figure as the page says it, and the value the
   * bar's height is of `most`. `scale` is the two ends of the scale as the page says them. The pointer on a bar, or the keyboard, which
   * reaches the chart in one Tab and moves along it with the left and right arrows, turns the bar to ink and shows its name and figure.
   */
  function chart({ label, bars, most, scale }) {
    const buttons = bars.map((bar) => {
      const words = join(bar.name, bar.figure);
      const one = h("button", { type: "button", class: "kit-bar", "aria-label": words, style: `--v:${Math.max(0, Math.min(1, bar.value / most)).toFixed(4)}` }, h("i"));
      labelled(one, words);
      return one;
    });
    const list = h("ol", { class: "kit-bars" }, buttons.map((one) => h("li", {}, one)));
    rove(list, buttons, "ArrowLeft", "ArrowRight");
    return h("figure", { class: "kit-chart", role: "group", "aria-label": label },
      h("div", { class: "kit-chart-scale", "aria-hidden": "true" }, h("span", {}, scale[0]), h("span", {}, scale[1])),
      list,
      h("div", { class: "kit-chart-names", "aria-hidden": "true" }, bars.map((bar) => h("span", {}, bar.name))));
  }

  /**
   * A timeline. `hours` are `{ at, words }`, `at` from 0 to 1 along it; `spans` are `{ id, name, from, to, state, words }`: a row's name,
   * where its bar starts and ends, `running`, `failed` or nothing, and the line its label says. The pointer on a row, or the keyboard,
   * which reaches the timeline in one Tab and moves along it with the up and down arrows, shows the label; a press, or Enter, hands the
   * row's id to `pick`.
   */
  function timeline({ label, hours, spans, pick }) {
    const buttons = spans.map((span) => {
      const one = h("button", { type: "button", class: "kit-span", "data-state": span.state, "aria-label": join(span.name, span.words), style: `--from:${span.from.toFixed(4)};--to:${span.to.toFixed(4)}`, onclick: () => pick?.(span.id) },
        h("span", { class: "kit-span-name", dir: "auto" }, span.name),
        h("span", { class: "kit-span-track" }, h("i")));
      labelled(one, span.words);
      return one;
    });
    const list = h("ol", { class: "kit-spans" }, buttons.map((one) => h("li", {}, one)));
    rove(list, buttons, "ArrowUp", "ArrowDown");
    return h("div", { class: "kit-timeline", role: "group", "aria-label": label },
      h("div", { class: "kit-hours", "aria-hidden": "true" }, hours.map((hour) => h("span", { class: hour.at <= 0 ? undefined : hour.at >= 1 ? "end" : "mid", style: `--at:${hour.at.toFixed(4)}` }, hour.words))),
      list);
  }

  /**
   * A switch between views of one page: the one shown is ink on wash. Either arrow goes to the other and shows it, Home to the first,
   * End to the last. `views` are `{ id, words }`; `change` hears the id shown.
   */
  function views({ label, views: all, shown, change }) {
    const tabs = all.map((view) => h("button", { type: "button", class: "board-view", role: "tab", "data-view": view.id }, view.words));
    const show = (id, focus) => {
      for (const tab of tabs) { const on = tab.dataset.view === id; tab.setAttribute("aria-selected", String(on)); tab.tabIndex = on ? 0 : -1; if (on && focus) tab.focus(); }
      change?.(id);
    };
    const box = h("div", { class: "board-views", role: "tablist", "aria-label": label, onkeydown: (event) => {
      const at = tabs.indexOf(document.activeElement);
      if (at === -1) return;
      const to = { ArrowLeft: (at - 1 + tabs.length) % tabs.length, ArrowRight: (at + 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (to === undefined) return;
      event.preventDefault();
      show(tabs[to].dataset.view, true);
    } }, tabs);
    for (const tab of tabs) tab.addEventListener("click", () => show(tab.dataset.view));
    show(shown ?? all[0].id);
    return box;
  }

  /**
   * A file, as a message names one; given its path in the tree, a button the board's own script in the page takes a press on, to show the
   * file on a tab of the board. The kit hears no press of its own.
   */
  const file = (name, path) => h(path === undefined ? "span" : "button", { class: "file-ref", ...(path === undefined ? {} : { type: "button", "data-cx-file": path }) }, icon("M7 3.5h7l4 4v13H7z", "M14 3.5v4h4"), h("span", { class: "file-ref-name" }, name));

  /**
   * Questions with options, as the chat's option card asks them, for a card of the page's. `form` is the platform's: an option form
   * (`comchatx.options/1`: `questions`, each `words`, `options` of `{ name, line? }`, `several: true` where more than one may be chosen,
   * `own: false` where the seller may not write their own) or a confirm form (`comchatx.confirm/1`: `title`, `message?`). The question in
   * front is the element's heading; `under` stands under it, before the options. `words` are the page's: `other`, `otherTo(question)`,
   * `submit`, `next`, `previous`, `position(n, total)`, `positionSaid(n, total)`, `skip`, `yes`, `no`. Several questions are asked one at
   * a time, Skip at the foot of each. The last press hands `answer` the seller's answers in the platform's form, `{ form, answers }`, an
   * answer a question in order, `{ chosen, own? }` or `null` for one skipped, or `{ form, confirmed }`, and the element takes no press
   * after it. It keeps what was chosen for as long as it lives, so a page that keeps the element keeps the choices across its draws.
   */
  function questions({ form, words, under, answer }) {
    const box = h("div", { class: "kit-asked" });
    const id = `kit-asked-${++asked}`;
    const confirm = form.form === "comchatx.confirm/1";
    const all = confirm ? [] : form.questions;
    const rows = all.map(() => ({ picked: new Set(), other: false, typed: "" }));
    let at = 0;
    let sent = false;
    const wrote = (one) => one.other && one.typed.trim() !== "";
    const has = (one) => one.picked.size > 0 || wrote(one);
    const answerOf = (question, one) => (!has(one) ? null : { chosen: [...one.picked].sort((a, b) => a - b).map((n) => question.options[n].name), ...(wrote(one) ? { own: one.typed.trim() } : {}) });
    const send = (value) => { sent = true; draw(); answer?.(value); };
    const submit = () => send({ form: form.form, answers: all.map((question, n) => answerOf(question, rows[n])) });
    const turn = (by, focus) => { at = Math.max(0, Math.min(at + by, all.length - 1)); draw(focus); };
    const step = (by, glyph, word, focus) => h("button", { type: "button", class: "kit-step", "aria-label": word, "data-focus": focus, disabled: sent || at + by < 0 || at + by >= all.length, onclick: () => turn(by, focus) }, icon(glyph));

    function asking() {
      const question = all[at], one = rows[at], last = at >= all.length - 1, kind = question.several === true ? "checkbox" : "radio";
      const choice = (checked, focus, change) => { const input = h("input", { type: kind, name: `${id}-${at}`, "data-focus": focus, disabled: sent, onchange: change }); input.checked = checked; return input; };
      const options = question.options.map((option, n) => h("label", { class: "kit-option" },
        choice(one.picked.has(n), `o${n}`, () => { if (question.several === true) { if (!one.picked.delete(n)) one.picked.add(n); } else { one.picked = new Set([n]); one.other = false; } draw(`o${n}`); }),
        h("span", { class: "kit-option-words", dir: "auto" }, h("span", {}, option.name), option.line && h("small", {}, option.line))));
      const main = h("button", { type: "button", class: "primary", "data-focus": "main", disabled: sent || !has(one), onclick: () => { if (last) submit(); else turn(1, "main"); } }, last ? words.submit : words.next);
      const own = one.other && h("input", { type: "text", class: "entry-field", dir: "auto", autocomplete: "off", "data-focus": "own", disabled: sent, value: one.typed, "aria-label": words.otherTo(question.words),
        oninput: (event) => { one.typed = event.target.value; main.disabled = !has(one); },
        onkeydown: (event) => { if (event.key === "Enter" && !event.isComposing && has(one)) { if (last) submit(); else turn(1, "main"); } } });
      const other = question.own !== false && h("div", { class: "kit-option-own" },
        h("label", { class: "kit-option" }, choice(one.other, "other", (event) => { one.other = event.target.checked; if (one.other && question.several !== true) one.picked = new Set(); draw(one.other ? "own" : "other"); }), h("span", { class: "kit-option-words" }, h("span", {}, words.other))),
        own);
      const several = all.length > 1;
      return [
        h("h3", { class: "entry-title", id: `${id}-q`, dir: "auto" }, several && h("span", { class: "kit-unseen" }, `${words.positionSaid(at + 1, all.length)} `), question.words),
        under,
        h("div", { class: "kit-options", role: question.several === true ? "group" : "radiogroup", "aria-labelledby": `${id}-q` }, options, other),
        h("div", { class: "kit-asked-foot" },
          several && h("span", { class: "kit-pager" }, step(-1, "M14.5 6l-6 6l6 6", words.previous, "previous"), h("span", { "aria-hidden": "true" }, words.position(at + 1, all.length)), step(1, "M9.5 6l6 6l-6 6", words.next, "next")),
          several && h("button", { type: "button", "data-focus": "skip", disabled: sent, onclick: () => { rows[at] = { picked: new Set(), other: false, typed: "" }; if (last) submit(); else turn(1, "skip"); } }, words.skip),
          main)];
    }
    function confirming() {
      const press = (yes) => h("button", { type: "button", class: yes ? "primary" : undefined, "data-focus": yes ? "yes" : "no", disabled: sent, onclick: () => send({ form: form.form, confirmed: yes }) }, yes ? words.yes : words.no);
      return [
        h("h3", { class: "entry-title", dir: "auto" }, form.title),
        under,
        form.message && h("p", { class: "kit-asked-message", dir: "auto" }, form.message),
        h("div", { class: "kit-asked-foot" }, press(false), press(true))];
    }
    function draw(focus) {
      const had = focus ?? (box.contains(document.activeElement) ? document.activeElement.dataset.focus : undefined);
      box.replaceChildren(...(confirm ? confirming() : asking()).filter((one) => one !== undefined && one !== null && one !== false));
      if (had === undefined) return;
      const to = held(box, had);
      // A press that waits for a choice cannot hold the keyboard: it goes to the question's first option.
      (to === undefined || to.disabled ? held(box, "o0") : to)?.focus();
    }
    draw();
    return box;
  }
  let asked = 0;
  /** The element under `node` that holds the keyboard by the name given, found among the questionnaire's own elements. */
  function held(node, name) {
    for (const child of node.children) { if (child.dataset.focus === name) return child; const found = held(child, name); if (found !== undefined) return found; }
    return undefined;
  }

  window.Kit = Object.freeze({
    get lang() { return zh() ? "zh" : "en"; },
    h, icon, chart, timeline, views, file, questions,
  });
})();
