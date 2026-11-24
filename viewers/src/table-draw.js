// A table edge to edge, its first row the head that stays as the rest scrolls, each cell drawn as its words.
const tableOf = (rows) => {
  const cells = (tag, row) => { const line = document.createElement("tr"); for (const one of row) { const cell = document.createElement(tag); cell.textContent = one; line.append(cell); } return line; };
  const [head = [], ...body] = rows;
  const table = document.createElement("table");
  const thead = document.createElement("thead"), tbody = document.createElement("tbody");
  thead.append(cells("th", head));
  for (const row of body) tbody.append(cells("td", row));
  table.append(thead, tbody);
  return table;
};
