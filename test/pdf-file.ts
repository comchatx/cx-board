// A PDF written by hand for the tests: pages of Latin text in Helvetica, Chinese text in STSong-Light (a font the file does not
// carry, so its characters are found by the UniGB-UCS2-H map), and a link whose target is a script.
export type PdfPage = { readonly lines?: readonly string[]; readonly chinese?: string; readonly link?: string; readonly box?: boolean; readonly broken?: boolean };

const escape = (text: string) => text.replace(/[\\()]/g, (one) => `\\${one}`);
const ucs2 = (text: string) => [...text].map((one) => one.charCodeAt(0).toString(16).padStart(4, "0")).join("").toUpperCase();

export function pdfFile(pages: readonly PdfPage[], more: { readonly opens?: string } = {}): string {
  const objects: string[] = [];
  const add = (body: string) => objects.push(body);
  const pageIds = pages.map((_, at) => 5 + at * 2);
  add(`<< /Type /Catalog /Pages 2 0 R${more.opens === undefined ? "" : ` /OpenAction << /S /JavaScript /JS (${escape(more.opens)}) >>`} >>`);
  add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  add("<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 4 >> /FontDescriptor << /Type /FontDescriptor /FontName /STSong-Light /Flags 6 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 880 /StemV 93 >> >>] >>");
  for (const page of pages) {
    const at = objects.length + 1;
    const text = (page.lines ?? []).map((line, n) => `BT /F1 11 Tf 56 ${780 - n * 15} Td (${escape(line)}) Tj ET`);
    if (page.chinese !== undefined) text.push(`BT /F2 18 Tf 56 ${760 - (page.lines?.length ?? 0) * 15} Td <${ucs2(page.chinese)}> Tj ET`);
    if (page.box === true) text.push("0.2 0.4 0.8 rg 56 56 200 120 re f");
    const stream = text.join("\n");
    const link = page.link === undefined ? "" : ` /Annots [<< /Type /Annot /Subtype /Link /Rect [56 700 300 720] /Border [0 0 0] /A << /S /URI /URI (${escape(page.link)}) >> >> << /Type /Annot /Subtype /Link /Rect [56 670 300 690] /A << /S /JavaScript /JS (app.alert\\(1\\)) >> >>]`;
    // A broken page is an entry of the page tree that is not a page: the file opens, and that page cannot be had.
    if (page.broken === true) add("(not a page)"); else add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${at + 1} 0 R${link} >>`);
    add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
  }
  let out = "%PDF-1.7\n";
  const offsets = objects.map((body, at) => {
    const offset = Buffer.byteLength(out, "latin1");
    out += `${at + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1").toString("base64");
}
