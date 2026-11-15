import {
  Context,
  createDefaultRegistry,
  createDefaultSystemContext,
  createOutputBundleHost,
  createRixCelTensorSheet,
  createRixCelWorkbookHost,
  enterEvaluationBudget,
  formatValue,
  materializeRixCelTensorPlane,
  parseAndEvaluate,
  renderOutputHtml
} from "./chunk-prx8fx2k.js";
import {
  Integer,
  Rational,
  createRixCelWorkbookDocument,
  exportRixCelDocument,
  parseRixCelDocument,
  replayRixCelDocument
} from "./chunk-n5a1tte6.js";

// src/xlsx-snapshot.js
function snapshotXlsxDocument(document, model, { maxCells = 4096, format = formatValue, prepare = () => {} } = {}) {
  if (document.shape.length !== 2)
    throw new Error("XLSX requires a rank-two document; materialize a plane into a separate document");
  const { slots } = replayRixCelDocument(document);
  if (document.defaultSlot.source.trim() !== "_") {
    if (document.shape[0] * document.shape[1] > maxCells)
      throw new Error("XLSX nonblank default exceeds cell limit");
    const explicit = new Map(slots.map((slot) => [slot.index.join(","), slot]));
    for (let row = 1;row <= document.shape[0]; row++)
      for (let column = 1;column <= document.shape[1]; column++)
        if (!explicit.has(`${row},${column}`))
          slots.push({ index: [row, column], ...document.defaultSlot });
  }
  if (slots.length > maxCells)
    throw new Error("XLSX cell count exceeds limit");
  prepare(slots.map((slot) => slot.index));
  const cells = slots.map((slot) => {
    const value = model.get(slot.index);
    let scalar;
    if (value === null)
      scalar = { kind: "blank", value: null };
    else if (value instanceof Integer)
      scalar = { kind: "integer", value: String(value.value) };
    else if (value instanceof Rational)
      scalar = { kind: "rational", value: `${value.numerator}/${value.denominator}` };
    else if (value?.type === "string")
      scalar = { kind: "string", value: value.value };
    else
      scalar = { kind: "display", value: format(value) };
    const imported = slot.view?.xlsx;
    if (imported?.importedSource === slot.source && imported.scalar)
      scalar = imported.scalar;
    return { index: slot.index, ...scalar, source: slot.source, metadata: slot.view ?? {} };
  });
  return { id: document.id, name: document.view?.title ?? document.id, shape: [...document.shape], cells, metadata: document.view ?? {} };
}
// src/evaluation-runtime.js
var RIXCEL_WITHHELD_CAPABILITIES = Object.freeze([
  "ImportJS",
  "JSCall",
  "CapabilityRegister",
  "TypeRegister",
  "TraitRegister",
  "TypeInstall",
  "TypeImport",
  "TypeExport",
  "Plugin",
  "Host",
  "Core",
  "Stream",
  "Retry"
]);
function createRixCelEvaluationState() {
  return {
    context: new Context,
    registry: createDefaultRegistry(),
    systemContext: createDefaultSystemContext().withhold(...RIXCEL_WITHHELD_CAPABILITIES)
  };
}
function setText(context, name, value) {
  context.setFresh(name, { type: "string", value: String(value ?? "") });
}
function evaluate(state, source) {
  return parseAndEvaluate(source, { ...state, file: "<rixcel-worker>" });
}
function sameHistoryPrefix(current, candidate) {
  if (!current || candidate.cursor !== candidate.events.length)
    return false;
  if (candidate.events.length !== current.cursor + 1)
    return false;
  return JSON.stringify(candidate.events.slice(0, current.cursor)) === JSON.stringify(current.events.slice(0, current.cursor));
}
function windowFor(shape, requested = {}) {
  const rowTotal = shape[0];
  const columnTotal = shape[1] ?? 1;
  const positive = (value, fallback) => Number.isSafeInteger(value) && value > 0 ? value : fallback;
  const rowStart = Math.min(positive(requested.rowStart, 1), rowTotal);
  const columnStart = Math.min(positive(requested.columnStart, 1), columnTotal);
  return {
    rowStart,
    rowCount: Math.min(positive(requested.rowCount, 40), rowTotal - rowStart + 1),
    columnStart,
    columnCount: Math.min(positive(requested.columnCount, 12), columnTotal - columnStart + 1)
  };
}
function prepareWorkbookWindow(workbook, id, window) {
  const model = workbook.sheet(id), indices = [];
  for (let row = window.rowStart;row < window.rowStart + window.rowCount; row++) {
    for (let col = window.columnStart;col < window.columnStart + window.columnCount; col++) {
      const index = model.shape.map((_, axis) => model.documentView.slice?.[axis] ?? 1);
      index[0] = row;
      if (index.length > 1)
        index[1] = col;
      indices.push(index);
    }
  }
  workbook.materialize(id, indices);
}

class RixCelEvaluationSession {
  constructor({ assetStore, authorizeExternal = null, workbookOptions = {} } = {}) {
    Object.assign(this, createOutputBundleHost({ assetStore, authorizeExternal, format: (value) => formatValue(value, { context: this.state.context, evaluate: null }) }));
    this.state = createRixCelEvaluationState();
    this.document = null;
    this.model = null;
    this.workbook = null;
    this.workbookOptions = workbookOptions;
    this.tensorLink = null;
  }
  open(value, activeDocument = null) {
    const input = typeof value === "string" ? JSON.parse(value) : value;
    if (input?.format === "rixcel-workbook") {
      const candidate = createRixCelWorkbookHost(input, { ...this.workbookOptions, withheld: RIXCEL_WITHHELD_CAPABILITIES });
      const id = activeDocument ?? candidate.export().documents[0].document.id;
      try {
        const model2 = candidate.sheet(id);
        prepareWorkbookWindow(candidate, id, windowFor(model2.shape));
      } catch (error) {
        candidate.dispose();
        throw error;
      }
      const previous = this.workbook;
      this.workbook = candidate;
      this.selectDocument(id);
      previous?.dispose();
      return this;
    }
    const document = parseRixCelDocument(value);
    const nextState = createRixCelEvaluationState();
    setText(nextState.context, "hosttext", JSON.stringify(document));
    const model = evaluate(nextState, ".RiXCelImport(hosttext)");
    nextState.context.setFresh("document", model);
    this.workbook?.dispose();
    this.workbook = null;
    this.state = nextState;
    this.document = document;
    this.model = model;
    return this;
  }
  selectDocument(id) {
    if (!this.workbook)
      throw new Error("No workbook is open");
    const model = this.workbook.sheet(id);
    this.document = this.workbook.export().documents.find((record) => record.document.id === id).document;
    this.model = model;
    this.state.context.setFresh("document", model);
    return this;
  }
  dispose() {
    this.workbook?.dispose();
    this.workbook = null;
    this.document = null;
    this.model = null;
  }
  applyEvent(event) {
    if (event.type === "slot:set") {
      this.model.setFormulaSource(event.index, event.source, event.assignmentMode);
    } else if (event.type === "slot:batch") {
      this.model.setFormulaSources(event.edits);
    } else if (event.type === "view:axis-label") {
      this.model.setAxisLabel(event.axis, event.coordinate, event.label);
    } else {
      throw new Error(`Unsupported RiX Ripple session event: ${event.type}`);
    }
  }
  commit(value) {
    const candidate = parseRixCelDocument(value);
    if (this.workbook) {
      if (candidate.id !== this.document.id)
        throw new Error("Edit must target the selected document");
      this.workbook.transaction([{ id: candidate.id, document: candidate }]);
      return this.selectDocument(candidate.id);
    }
    if (!sameHistoryPrefix(this.document, candidate) || !["slot:set", "slot:batch", "view:axis-label"].includes(candidate.events.at(-1)?.type))
      return this.open(candidate);
    try {
      this.applyEvent(candidate.events.at(-1));
      this.document = candidate;
    } catch (error) {
      this.open(this.document);
      throw error;
    }
    return this;
  }
  withTensor(source, run) {
    if (typeof source !== "string" || !source.trim() || source.length > 1e4)
      throw new Error("Tensor expression must contain 1–10000 characters");
    const record = this.workbook?.export() ?? createRixCelWorkbookDocument([{ document: this.document }]);
    const isolated = createRixCelWorkbookHost(record);
    const state = createRixCelEvaluationState();
    const blocked = state.systemContext.getAllNames().filter((name) => (state.systemContext.get(name).groups ?? []).some((group) => ["Async", "Files", "Net", "Random"].includes(group)));
    state.systemContext = state.systemContext.withhold(...blocked, "Eval", "Config", "RangePolicy", "RegisterMethod", "Print", "Debug", "Dump");
    state.context.setFresh("document", isolated.sheet(this.document.id));
    const budget = enterEvaluationBudget(state.context, { maxSteps: 1e5, maxTimeMs: 1000 });
    try {
      return run(evaluate(state, source));
    } finally {
      budget.leave();
      isolated.dispose();
    }
  }
  tensorHtml(source, options) {
    return this.withTensor(source, (tensor) => renderOutputHtml(createRixCelTensorSheet(tensor, options), (value) => formatValue(value)));
  }
  materializeTensor(source, options) {
    const candidate = this.withTensor(source, (tensor) => materializeRixCelTensorPlane(this.document, tensor, options));
    this.commit(candidate.document);
    return this;
  }
  project(requestedWindow = {}, preparedTensorHtml = null) {
    if (!this.model || !this.document)
      throw new Error("RiX Ripple worker has no open document");
    const window = windowFor(this.document.shape, requestedWindow);
    if (this.workbook)
      prepareWorkbookWindow(this.workbook, this.document.id, window);
    const view = evaluate(this.state, `.Sheet(document, {=
            title="RiX Ripple document",
            rowStart=${window.rowStart}, rowCount=${window.rowCount},
            columnStart=${window.columnStart}, columnCount=${window.columnCount}
        })`);
    const html = renderOutputHtml(view, (value) => formatValue(value, { context: this.state.context, evaluate: null }));
    let tensorHtml = null, tensorError = null;
    if (this.tensorLink) {
      try {
        tensorHtml = preparedTensorHtml ?? this.tensorHtml(this.tensorLink.source, this.tensorLink.options);
        this.tensorLink.lastHtml = tensorHtml;
      } catch (error) {
        tensorError = error.message;
        tensorHtml = this.tensorLink.lastHtml ?? null;
      }
    }
    return {
      tensorHtml,
      tensorError,
      document: this.document,
      ...this.workbook ? { workbook: this.workbook.export(), activeDocument: this.document.id } : {},
      html,
      epoch: this.model.epoch,
      shape: [...this.document.shape],
      window,
      materializedSlotCount: this.model.materializedSlotCount
    };
  }
  import(request) {
    const kind = request.kind === "tsv" ? "tsv" : request.kind === "csv" ? "csv" : "rixcel";
    if (kind === "rixcel")
      return this.open(request.text, request.activeDocument);
    const importState = createRixCelEvaluationState();
    setText(importState.context, "hosttext", request.text);
    setText(importState.context, "hostid", request.id || "imported");
    const fn = kind === "tsv" ? ".RiXCelImportTsv" : ".RiXCelImportCsv";
    const model = evaluate(importState, `${fn}(hosttext, {= header=${request.header ? 1 : 0}, id=hostid })`);
    return this.open(exportRixCelDocument(model));
  }
  exportDelimited(kind) {
    if (!this.model)
      throw new Error("RiX Ripple worker has no open document");
    const fn = kind === "tsv" ? ".RiXCelExportTsv" : ".RiXCelExportCsv";
    return evaluate(this.state, `${fn}(document)`).value;
  }
  exportXlsxSnapshot() {
    if (!this.model)
      throw new Error("No document is open");
    const documents = this.workbook ? this.workbook.export().documents.map((record) => record.document) : [this.document];
    const sheets = [];
    let count = 0;
    for (const document of documents) {
      const model = this.workbook ? this.workbook.sheet(document.id) : this.model;
      const sheet = snapshotXlsxDocument(document, model, { maxCells: 4096 - count, prepare: (indices) => this.workbook?.materialize(document.id, indices), format: (value) => formatValue(value, { context: this.state.context, evaluate: null }) });
      count += sheet.cells.length;
      sheets.push(sheet);
    }
    return { sheets };
  }
  handle(request) {
    if (request?.type === "tensor-snapshot") {
      this.materializeTensor(request.source, request.options ?? {});
      return this.project(request.window);
    }
    if (request?.type === "tensor-link") {
      const options = request.options ?? {};
      const html = this.tensorHtml(request.source, options);
      this.tensorLink = { source: request.source, options, lastHtml: html };
      return this.project(request.window, html);
    }
    if (request?.type === "tensor-unlink") {
      this.tensorLink = null;
      return this.project(request.window);
    }
    if (request?.type === "open") {
      this.open(request.document, request.activeDocument);
      this.tensorLink = null;
      return this.project(request.window);
    }
    if (request?.type === "commit") {
      this.commit(request.document);
      return this.project(request.window);
    }
    if (request?.type === "refresh-external") {
      if (!this.workbook)
        throw new Error("No workbook is open");
      return this.workbook.refresh(request.id).then(() => this.project(request.window));
    }
    if (request?.type === "select-document") {
      this.selectDocument(request.id);
      this.tensorLink = null;
      return this.project(request.window);
    }
    if (request?.type === "dispose") {
      this.dispose();
      return { disposed: true };
    }
    if (request?.type === "project")
      return this.project(request.window);
    if (request?.type === "import") {
      this.import(request);
      this.tensorLink = null;
      return this.project(request.window);
    }
    if (request?.type === "export-xlsx-snapshot")
      return this.exportXlsxSnapshot();
    if (request?.type === "export")
      return { text: this.exportDelimited(request.kind) };
    if (request?.type === "validate") {
      const isolated = new RixCelEvaluationSession;
      isolated.open(request.document);
      const result = { document: isolated.document, ...isolated.workbook ? { workbook: isolated.workbook.export() } : {} };
      isolated.dispose();
      return result;
    }
    throw new Error(`Unknown RiX Ripple worker request: ${request?.type || "missing type"}`);
  }
}

// src/evaluation-worker.js
var session = new RixCelEvaluationSession;
self.addEventListener("message", async (event) => {
  const { id, request } = event.data || {};
  try {
    self.postMessage({ id, type: "result", value: await session.handle(request) });
  } catch (error) {
    self.postMessage({
      id,
      type: "error",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

//# debugId=C9B2E84C4A9A8BF264756E2164756E21
//# sourceMappingURL=evaluation-worker.js.map
