# RiX Ripple

RiX Ripple is the standalone FormulaSheet editor for RiX. It uses exact RiX values,
reactive formula dependencies, tensor-aware views, and the versioned `.rixcel`
document format.

From `apps/cel/`:

```sh
bun test
bun run build
python3 -m http.server 3000 --directory docs
```

The standalone milestone includes formula editing, assignment modes,
exact-value feedback, named tensor coordinates, local recovery, native
`.rixcel` open/save, CSV/TSV import/export, and document undo/redo. Version 3
documents are sparse event logs: edits store canonical executable RiX commands,
and undo/redo moves a cursor through that history. Shift-selection supports
multi-cell clipboard paste; Command/Ctrl+D fills down and Command/Ctrl+R fills
right. Each paste or fill is one atomic `slot:batch` history event. Imported
FormulaSheet graphs remain sparse and materialize implicit null cells lazily.
The persistent graph and bounded visible-plane HTML projection live in a
restricted Web Worker; the main thread holds only the event log and interactive
DOM. Row and column window controls keep large logical sheets bounded to a
small rendered table. A timed-out worker is terminated, and the next complete
candidate log can reconstruct its session. The shared runtime and widget
protocol live in the sibling `rix` repository.

Formula parse, cycle, and runtime failures are recoverable in place. The grid
marks affected cells, keeps their last committed values visible, and preserves
the failed source in the formula editor until it is corrected.

## Portable output assets

`RixCelEvaluationSession` exposes the same `exportOutputBundle(value)` and
`importOutputBundle(json)` host APIs as Web and Notebook. A host can supply an
explicit preloaded `assetStore`; there is no ambient filesystem or network
access. Bundles retain exact output snapshots and hash-verified files, and
imports never evaluate saved formulas. These APIs are for embedding/export
integration; the normal `.rixcel` event-log format and editor save action remain
separate. See `../../rix/documentation/eval/output-assets.md`.

## Structural editing and persistent history

Use **Insert row/column before selection** to insert one position. The portable
`axis:insert` event also supports rank-N axes and a bounded count. Literal `grid`
coordinates and relative `near` targets move with their cells; cell IDs remain
stable. Dynamic/aliased references and unresolved editor drafts block insertion
with a diagnostic, leaving the saved sheet unchanged. Undo/redo restores both
shape and formulas, including after restart or reopening a saved file.

Version 3 adds `initialShape` and cursor-derived `shape`. Versions 0–2 migrate
on open. Insertion rebuilds only the sparse active formulas in an isolated worker
candidate; it never fills the logical grid. See the shared
[format specification](../../rix/documentation/design/eval/rixcel-format.md).

`bun run test:browser` builds an isolated test site and exercises real Chromium
editing, fill/copy, insertion, draft recovery, save/open/restart, undo/redo and
large sparse navigation. It uses a host-installed `playwright`; optional
`RIX_PLAYWRIGHT_MODULE` and `RIX_CHROME_EXECUTABLE` point to existing installations.
Artifacts stay under the umbrella repository's `tmp/c1-browser/`. Normal builds
still use `docs/`; `RIXCEL_BUILD_DIR` selects an isolated build directory.

## Workbooks

Open a `.rixbook` file to use named exports across documents. The toolbar selector
switches documents; editing or undoing an input recomputes dependent outputs
atomically. Saving and local recovery retain every document and its configuration.
Try [cross-sheet.rixbook](../../rix/examples/rixcel/cross-sheet.rixbook).

See the [workbook guide](../../rix/documentation/eval/workbooks.md) for explicit
`book`, `names`, `imports`, exact external snapshots, bounded manual refresh,
host-only scheduling and disposal. No external provider is installed by opening
a file. `createRixCelWorkbookHost` supplies the isolated evaluator for embeddings;
the ordinary worker supports workbook open/select/commit and keeps formula
execution out of the UI thread. Browser acceptance includes cross-sheet edits,
persistent workbook selection, save/restart and undo.

## XLSX values interchange

**Open** accepts `.xlsx` alongside `.rixcel`, `.rixbook`, CSV and TSV.
**Export XLSX values** writes the current sheets as values: it does not translate
RiX formulas into executable Excel formulas. Foreign Excel formulas also remain
inert metadata/text on import. Use `.rixcel` or `.rixbook` for executable RiX
source, dependency structure and editable event history.

Arbitrary rational values and large integers are exported as text to avoid Excel
rounding. A hidden metadata sheet retains exact source values and supported
metadata; if a visible Excel cell changes, stale exact metadata is discarded on
reimport. Interchange reports omitted or approximate display values explicitly.
Imports reject macros and external workbook links. Limits are 8 MB compressed,
24 MB expanded, 256 ZIP entries, 32 sheets and 4096 retained cells; the bounded
sparse layout may still have large logical dimensions. This is values exchange,
not complete Excel feature or style compatibility.

Run `bun run test:xlsx-browser` to check real browser open/export/reopen.

## Tensor planes, named regions, and formatting

Expand **Tensor planes, regions and formatting** beneath the toolbar. The default
expression is a small exact matrix. Choose visible axes and fix hidden coordinates
with a slice such as `_,_,2`. **Link read-only view** keeps a session-local view
that refreshes after edits; use `document` in the expression to read the active
sheet. The link is not saved as a new reactive formula dependency.

**Snapshot into empty cells** copies the selected plane as exact formula values
in one atomic edit, limited to 4096 cells. Set destination start and axes first.
An occupied destination or invalid plane rejects the whole edit; existing cells
remain intact. Snapshots stay fixed when the original tensor changes.

Name an inclusive coordinate block using **Save region**, then apply formatting
to that block. Names organize addresses without changing numeric coordinates.
Decimal display uses 0–20 places and never changes exact stored values. Regions
and formatting survive save, recovery and undo/redo. Insertion adjusts their
bounds with the sheet; **Clear formatting** removes the block's display styling.
See the [tensor guide](../../rix/documentation/eval/rixcel-tensors.md) and
[region guide](../../rix/documentation/eval/rixcel-regions.md) for rank-N rules,
finite windows, and embedding APIs.

`bun scripts/check-tensor-browser.js` exercises snapshots, live views, collision
rejection, regions, formatting and persistence in Chromium. It uses the same
Playwright/Chrome overrides as the other browser checks.
