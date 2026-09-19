# RiXCel

RiXCel is the standalone FormulaSheet editor for RiX. It uses exact RiX values,
reactive formula dependencies, tensor-aware views, and the versioned `.rixcel`
document format.

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
