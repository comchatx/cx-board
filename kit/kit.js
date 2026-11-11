// The elements' script: what the board puts into a page, after `kit.css` and before the page's own code. It gives the elements that need
// a script, a chart, a timeline and a switch, with what a pointer and a keyboard do on them, and a file as a message names one. A page
// reaches all of it through `Kit`. It carries no words: every line it draws is the page's. The board's own asks are `window.cxBoard`'s,
// which the board defines; nothing here speaks across the frame's edge or loads anything.
(() => {
  "use strict";
  const root = document.documentElement;
  root.classList.add("kit");
  // The board sets `lang` on the page's root; Chinese joins a name and its figure with its own comma.
  const zh = () => /^zh\b/i.test(root.lang);
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
  function showTip(target, words) {
    if (!tip.isConnected) document.body.append(tip);
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
  addEventListener("scroll", () => hideTip(), { passive: true });

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

  /** A file, as a message names one. */
  const file = (name) => h("span", { class: "file-ref" }, icon("M7 3.5h7l4 4v13H7z", "M14 3.5v4h4"), h("span", { class: "file-ref-name" }, name));

  window.Kit = Object.freeze({
    get lang() { return zh() ? "zh" : "en"; },
    h, icon, chart, timeline, views, file,
  });
})();
