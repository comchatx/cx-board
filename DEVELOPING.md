# Developing cx-board

## Install

```bash
pi install npm:@comchatx/cx-board
```

## Viewer pages

A viewer page is assembled from its source under `viewers/src/`: `npm run viewers` writes each page under `viewers/` with a file inline where the source names it, `<script src="lib:<package>/<file>"></script>` a pinned dependency's, `file:<directory>/<file>` one carried under `scripts/`, `part:<file>` one of `viewers/src/` (the table's drawing, which the CSV and the Excel pages share, and the board's line for a file it cannot read, in the board's words, colour and size from the values a page is handed, not its exact look), and each library's licence under `viewers/licences/`. A page is drawn in a frame of no origin and cannot load a file of the package, so the library stands in the page. The assembled pages are committed; `test/package.test.ts` holds each equal to what the script makes and at most 5 MiB. To take a new release of a library, pin it in `package.json`, run `npm run viewers`, and run the tests.

### The Word reader

The Word page draws a file by mammoth's built-in styles alone: `includeEmbeddedStyleMap: false` leaves unread a style map a file carries, which would otherwise name the elements and attributes a paragraph is drawn as.

### The Excel reader

The Excel page reads a file with SheetJS Community Edition 0.20.3, which its publisher offers at `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` and not on npm. It is carried as one file, `scripts/sheetjs/xlsx.mini.min.js` from that tarball's `package/dist/`, with the tarball's `LICENSE` beside it. Its sha256 is `0cb353f830d7288385492c83d277b058ddeac664ca51cf1393aa1fd3e2b70939`, and `test/package.test.ts` holds the file to it.

A new version is a new file and its sha256, written here and in the test, and a rebuilt page, in a pull request that is reviewed.
