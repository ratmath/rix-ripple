# XLSX value interchange

Use **Open** to select an `.xlsx` file. Each Excel worksheet becomes an independent
RiXCel document in a workbook; the document selector switches sheets. **Export XLSX
values** saves the current values of every document. Save `.rixbook` to retain live
RiX formulas, owned names, cross-document exports, history and drafts.

Excel formulas are always imported as quoted, inert text such as `=SUM(A1:A3)`.
Cached formula results do not override the formula text. No Excel formulas, macros,
links, or original RiX source metadata are executed. Export writes value cells, never
Excel formulas. Executable formula translation remains a later decision (D6).

Exact integers of more than 15 digits and all rational fractions are written as text
so Excel does not silently round them. Other Excel numbers already have the precision
stored by Excel; earlier lost digits cannot be recovered. The status message explains
these boundaries. Dates use ISO text, booleans retain their scalar type, and unsupported
mathematical objects become display text.

The hidden `_RiXCel_values` worksheet records dimensions, exact scalar types, sheet
identity, original source and per-cell metadata. On reimport, exact metadata is used
only when the visible value still matches. Editing a visible Excel value invalidates
that cell's stale exact metadata. Original source is retained in `view.xlsx` as inert
provenance; it is never restored as a formula. Removing the hidden worksheet loses
this additional information but leaves the visible value worksheets usable. Without
metadata, fractions written as text remain ordinary strings.

Sparse dimensions remain sparse: a million-row sheet with one explicit value exports
one value. Blank trailing dimensions survive through metadata; foreign XLSX declared
dimensions are read as well. Nonblank implicit default formulas must be materialized
and therefore obey the cell limit. Rank-N sheets must first be materialized into a separate rank-two document. The
current UI plane selector does not enable XLSX export for a rank-N document; explicit
plane materialization is planned in C4. Automatic spill behavior remains D6.

Limits are 8 MB compressed input/output, 24 MB actually expanded ZIP content, 256 ZIP
entries, 32 value sheets, 4,096 populated values in total, and Excel's 1,048,576 by
16,384 coordinate bounds. Text is limited to 32,767 characters per cell/metadata row.
Hosts may lower limits. ZIP entries are inflated incrementally, actual bytes counted,
then canonicalized before the XLSX parser runs. XML dimensions and coordinates are
checked first. DTDs, macros and external workbook links are rejected. Merges, formatting,
validations and drawings are ignored; only values, sheet identity and dimensions are
part of this interchange contract.

The host adapter is `src/xlsx-interchange.js`, with a separate scalar snapshot helper
in `src/xlsx-snapshot.js`. Both are independent of account access or Excel automation.
Tests cover exact and edited round trips, sparse large dimensions, inert formulas and
source injection, blank cells, foreign scalar types, nonblank defaults, and ZIP/XML
allocation limits.


## Inert metadata format

`_RiXCel_values!A1` is the version marker `rixcel.xlsx.values@1`. Subsequent rows
contain one JSON object in column A. A `kind: "sheet"` object has `sheet`, `id`,
`shape: [rows, columns]` and inert `metadata`. A `kind: "cell"` object has `sheet`,
`index: [row, column]`, `scalar: {kind, value}`, `visible`, inert `source`, and
`metadata`. Scalar kinds are `integer`, `rational`, `number`, `boolean`, `blank`,
`string`, `date`, `error`, `formula`, and `display`. Exact integer/rational payloads
are validated decimal strings, never source code.

Restoration checks both the current Excel value against `visible` and the scalar's
recomputed visible encoding against `visible`. A forged hidden scalar cannot replace
a different visible value. Blank records are separately bounded and validated; source
metadata never changes the generated constant formula. This worksheet is provenance,
not an authority to evaluate code or alter unrelated cells.
