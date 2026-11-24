# Developing cx-board

## Install

```bash
pi install npm:@comchatx/cx-board
```

## The kit's switch and file mark

`Kit.views` draws the product's choice (`src/web/forms.ts` and `src/web/site/forms.css` in ComChatX): one track on `--wash`, the view shown on one pill on `--held`, with `--raised` where the platform hands no `--held`, sliding in 120 ms and still under reduced motion. A `shown` that none of the views is selects none and draws no pill, as 0.3.12 did, and `change` still hears it. `Kit.file` draws the chat's file mark (`src/web/board-files.ts` in ComChatX): the kind's mark from the path's last part where a path is given, else from the name, giving way to the board's mark under the pointer or the keyboard where a press opens it. `test/kit-dom.test.ts` holds the structure, the selection, the callback and the rules as written; happy-dom draws no layout and resolves no `:hover` or nested `var()` fallback, so where the pill lands and how the marks swap are not witnessed there.

## Viewer pages

A viewer page is assembled from its source under `viewers/src/`: `npm run viewers` writes each page under `viewers/` with a file inline where the source names it, `<script src="lib:<package>/<file>"></script>` a pinned dependency's, `file:<directory>/<file>` one carried under `scripts/`, `part:<file>` one of `viewers/src/` (the table's drawing, which the CSV and the Excel pages share, and the board's line for a file it cannot read, in the board's words, colour and size from the values a page is handed, not its exact look), and each library's licence under `viewers/licences/`. A page is drawn in a frame of no origin and cannot load a file of the package, so the library stands in the page. The assembled pages are committed; `test/package.test.ts` holds each equal to what the script makes and at most 5 MiB. To take a new release of a library, pin it in `package.json`, run `npm run viewers`, and run the tests.

### The Word reader

The Word page draws a file by mammoth's built-in styles alone: `includeEmbeddedStyleMap: false` leaves unread a style map a file carries, which would otherwise name the elements and attributes a paragraph is drawn as.

### The Excel reader

The Excel page reads a file with SheetJS Community Edition 0.20.3, which its publisher offers at `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` and not on npm. It is carried as one file, `scripts/sheetjs/xlsx.mini.min.js` from that tarball's `package/dist/`, with the tarball's `LICENSE` beside it. Its sha256 is `0cb353f830d7288385492c83d277b058ddeac664ca51cf1393aa1fd3e2b70939`, and `test/package.test.ts` holds the file to it.

A new version is a new file and its sha256, written here and in the test, and a rebuilt page, in a pull request that is reviewed.

### The PDF reader

The PDF page reads a file with `pdfjs-dist`, pinned exact. Its worker module is carried in the page before the library, which then runs it on the page's own thread: a frame of no origin can start no worker. The character maps for Simplified and Traditional Chinese text in a font the file doesn't embed are carried in the page as well, and pdf.js asks the page for them; the page hands pdf.js no address, so it fetches nothing. Japanese and Korean maps, and the JBIG2 and JPEG 2000 decoders pdf.js loads by address, are not carried. Each page is drawn once at the tab's width, kept as a picture, and its canvas let go.

`test/pdf.browser.test.ts` draws the page in Chrome, in a frame of no origin under the platform's page policy (`test/browser.ts`), through `playwright-core` and the Chrome installed on the machine; the CI's runner carries one. Its Chinese page shows that the carried maps matter: with them taken out, that page draws no ink. That the characters are the right ones is seen on a real Chinese file after a release. A new pdf.js version is a bump of the pin, `npm run viewers`, and these tests.
