# Tensor planes, named regions and formatting

Open **Tensor planes, regions and formatting** above the sheet.

Use a finite Shaped expression such as `{:2x2: 1/3,2/3;3,4}`. The expression runs
in an isolated, bounded worker context and can read the current sheet through
`document`, for example `{:1x1: document[1,1]*2}`. It cannot mutate that document
or access host files, network, plugins or asynchronous capabilities.

**Snapshot into empty cells** copies a selected plane into exact formula slots
in one undoable event. Visible axes and destination axes are one-based lists,
such as `1,2`. For a rank-three source, select axes `2,3` and fixed coordinates
`1,_,_` to copy its first plane. Destination start must contain one coordinate
per destination axis. A shape mismatch, occupied cell, failed draft or unsupported
scalar rejects the entire snapshot. A formula returning null is still occupied.
Snapshots contain scalar values, not links or translated formulas. They survive
save/open and can be exported through the existing XLSX values adapter.

**Link read-only view** displays the selected plane without occupying cells.
It reevaluates the expression after sheet edits and undo/redo. Change the plane
fields and click the button again to replace it. Invalid replacements preserve
the existing link; later evaluation failures retain the last valid plane with a diagnostic until the source
is valid again. Links belong to the current editor session and are closed when
opening or selecting another document. Use a snapshot to save values permanently.
Planes are limited to 4,096 cells. Countable axes require an explicit finite
projection before use; automatic spill behavior remains deferred.

For a **named region**, enter inclusive start and end coordinates of the same
rank as the document, then save its name. Select a saved region to reuse its
bounds. Names label blocks; formula references keep their canonical numeric
addresses. Insertions before a region shift it; insertions inside expand it.

**Apply to block** adds formatting to the selected bounds. Bold, italic, highlight,
alignment, and exact/decimal display are view properties. Decimal display shows
rounding through the shared numeric presentation rules; stored numbers and
formula sources remain exact. Clear formatting removes prior style properties
within the block. Regions and formatting are saved in the document history and
support undo/redo. They do not claim Excel style/formula compatibility.

Notebook supports the same operations through `.cel(...)` handles:
`Materialize`, `TensorView`, `Region`, and `Format`. See the Notebook
`examples/cel-embedding` project and the shared RiX references
`rix/documentation/eval/rixcel-tensors.md` and `rixcel-regions.md`.
