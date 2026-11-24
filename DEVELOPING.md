# Developing cx-board

## Install

```bash
pi install npm:@comchatx/cx-board
```

## Viewer pages

A viewer that draws a file with a library is assembled from its source under `viewers/src/`: `npm run viewers` writes each page under `viewers/` with the pinned library's file inline where the source names it (`<script src="lib:<package>/<file>"></script>`), and the library's licence under `viewers/licences/`. A page is drawn in a frame of no origin and cannot load a file of the package, so the library stands in the page. The assembled pages are committed; `test/package.test.ts` holds each equal to what the script makes and at most 5 MiB. To take a new release of a library, pin it in `package.json`, run `npm run viewers`, and run the tests.
