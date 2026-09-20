# C3 XLSX adapter dependency decision

Date: 2026-09-20. Scope: values and worksheet structure, not executable Excel formulas.

No compatible XLSX reader/writer was installed in the repository. This adapter pins
**@protobi/exceljs 4.4.0-protobi.10** (MIT), using its browser build for browser and Bun
hosts. This is a compatible, actively maintained community fork of ExcelJS. The
published version was released on 2026-05-07, verified against the official npm
registry; the upstream fork's latest commit at review was `e5e2c23d` on 2026-06-05.
The main ExcelJS project's discussion #3008 announces this maintained fork.

The original ExcelJS 4.4.0 release is from October 2023, with its last main-branch
commit in January 2024. It was therefore replaced before shipping rather than being
represented as actively maintained. The fork's source manifest reports the next
unpublished `.11` version; we intentionally pin the actually published `.10` release.
The adapter boundary allows later replacement independently of RiX syntax, workbook
semantics and notebook integration.

- [Maintained fork source](https://github.com/protobi/exceljs)
- [MIT license](https://github.com/protobi/exceljs/blob/master/LICENSE)
- [Fork package manifest](https://github.com/protobi/exceljs/blob/master/package.json)
- [Maintenance announcement in the original project](https://github.com/exceljs/exceljs/discussions/3008)
- [Published package metadata](https://registry.npmjs.org/@protobi%2fexceljs)
- [Original releases](https://github.com/exceljs/exceljs/releases)

**fflate 0.8.2** (MIT), already used by the Notebook host, supplies incremental ZIP
inflation and canonical repacking. **saxes 6.0.0** (ISC) supplies a namespace-aware
XML preflight; ExcelJS already uses saxes internally, but the explicit dependency
keeps the adapter's boundary independently declared and pinned. The preflight counts
actual inflated bytes, rejects entities and oversized coordinates, and avoids trusting
only ZIP size headers. The downstream reader ignores merge/style/validation nodes
that can otherwise expand large coordinate ranges.

- [fflate upstream](https://github.com/101arrowz/fflate)
- [saxes upstream](https://github.com/ldd/saxes)

The umbrella lockfile records transitive dependencies. No CDN dependency, account
integration, Excel automation, macro execution or evaluator callback is introduced.
Foreign formulas and original source metadata are data only. Numeric precision is
handled by visible text for exact fractions/large integers, accompanied by a hidden
scalar metadata worksheet; it is never repaired by silently executing source text.
