// The line the board draws when it cannot read a file, in its words and its look, for a file the page's library cannot read.
const unreadable = () => {
  const root = document.documentElement, line = document.createElement("p");
  line.setAttribute("role", "status");
  line.style.cssText = "margin: calc(var(--space-6) - var(--space-5)) 0 0; color: var(--quiet); font-size: var(--size-small); line-height: var(--leading-small);";
  line.textContent = /^zh\b/i.test(root.dataset.locale || root.lang) ? "无法读取此文件。" : "This file can't be read.";
  return line;
};
