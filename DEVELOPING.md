# Developing cx-board

## Install

```bash
pi install npm:@comchatx/cx-board
```

## The kit's switch and file mark

`Kit.views` draws the product's choice (`src/web/forms.ts` and `src/web/site/forms.css` in ComChatX): one track on `--wash`, the view shown on one pill on `--held`, with `--raised` where the platform hands no `--held`, sliding in 120 ms and still under reduced motion. A `shown` that none of the views is selects none and draws no pill, as 0.3.12 did, and `change` still hears it. `Kit.file` draws the chat's file mark (`src/web/board-files.ts` in ComChatX): the kind's mark from the path's last part where a path is given, else from the name, giving way to the board's mark under the pointer or the keyboard where a press opens it. `test/kit-dom.test.ts` holds the structure, the selection, the callback and the rules as written; happy-dom draws no layout and resolves no `:hover` or nested `var()` fallback, so where the pill lands and how the marks swap are not witnessed there.
