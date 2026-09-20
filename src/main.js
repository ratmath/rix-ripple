import {
    appendRixCelEvent,
    clearRixCelDraft,
    createRixCelDocument,
    enhanceSheetViews,
    parseRixCelDocument,
    replayRixCelDocument,
    setRixCelCursor,
    setRixCelDraft,
    stringifyRixCelDocument,
    stringifyRixCelWorkbook,
} from "../../../rix/src/index.js";
import { RixCelWorkerClient } from "./evaluation-worker-client.js";

const STORAGE_KEY = "rixcel.autosave.v2";
const LEGACY_STORAGE_KEY = "rixcel.autosave.v1";
const evaluationWorker = new RixCelWorkerClient({ timeoutMs: 2000 });
const host = document.querySelector("#sheet-host");
const fileInput = document.querySelector("#file-input");
const status = document.querySelector("#status");
const documentName = document.querySelector("#document-name");
const headerToggle = document.querySelector('[data-field="header"]');
const undoButton = document.querySelector('[data-action="undo"]');
const redoButton = document.querySelector('[data-action="redo"]');
const previousRowsButton = document.querySelector('[data-action="previous-rows"]');
const nextRowsButton = document.querySelector('[data-action="next-rows"]');
const previousColumnsButton = document.querySelector('[data-action="previous-columns"]');
const nextColumnsButton = document.querySelector('[data-action="next-columns"]');
const windowStatus = document.querySelector("#window-status");
const switchDialog = document.querySelector("#switch-document-dialog");

let documentLog = null;
let workbookLog = null;
const documentSelector = document.querySelector("#workbook-document");
let projection = null;
let name = "Untitled.rixcel";
let dirty = false;
let sessionFloorCursor = 0;
let selectedIndex = [1,1];
let pendingCommit = false;
const viewport = { rowStart: 1, rowCount: 40, columnStart: 1, columnCount: 12 };

function setStatus(message) {
    status.textContent = message;
}

function updateHistoryButtons() {
    undoButton.disabled = pendingCommit || !documentLog || documentLog.cursor <= sessionFloorCursor;
    redoButton.disabled = pendingCommit || !documentLog || documentLog.cursor >= documentLog.events.length;
}

function updateWindowControls() {
    if (!projection) return;
    const { rowStart, rowCount, columnStart, columnCount } = projection.window;
    const [rowTotal, columnTotal = 1] = projection.shape;
    previousRowsButton.disabled = rowStart <= 1;
    nextRowsButton.disabled = rowStart + rowCount > rowTotal;
    previousColumnsButton.disabled = columnStart <= 1;
    nextColumnsButton.disabled = columnStart + columnCount > columnTotal;
    windowStatus.textContent = `Rows ${rowStart}–${rowStart + rowCount - 1} of ${rowTotal} · Columns ${columnStart}–${columnStart + columnCount - 1} of ${columnTotal}`;
}

function savedDocument() {
    return workbookLog ? { ...workbookLog, documents: workbookLog.documents.map(record => record.document.id === documentLog.id ? { ...record, document: documentLog } : record) } : documentLog;
}
function savedText() { return workbookLog ? stringifyRixCelWorkbook(savedDocument()) : stringifyRixCelDocument(documentLog); }

function persistRecovery() {
    if (!documentLog) return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            name,
            document: savedText(),
            activeDocument: documentLog.id,
            dirty,
        }));
    } catch (error) {
        setStatus(`Local recovery unavailable: ${error.message || String(error)}`);
    }
}

function decorateDrafts() {
    for (const draft of documentLog?.drafts || []) {
        const address = `grid[${draft.index.join(",")}]`;
        const cell = [...host.querySelectorAll("td[data-rix-address]")]
            .find((candidate) => candidate.dataset.rixAddress === address);
        if (!cell) continue;
        cell.dataset.rixState = "error";
        cell.dataset.rixDiagnosticKind = draft.kind;
        cell.dataset.rixDiagnosticSource = draft.source;
        cell.dataset.rixDiagnostics = JSON.stringify([draft.message]);
        cell.setAttribute("aria-invalid", "true");
        cell.title = `${cell.title} · ${draft.kind} draft: ${draft.message}`;
    }
}

function errorKind(message) {
    return /compile|parse|token|unexpected/iu.test(message)
        ? "parse"
        : /cycle/iu.test(message)
            ? "cycle"
            : "runtime";
}

function renderProjection(nextProjection) {
    projection = nextProjection;
    // Preserve requested window capacity when a small document clips the projection.
    Object.assign(viewport, { rowStart: nextProjection.window.rowStart, columnStart: nextProjection.window.columnStart });
    host.innerHTML = nextProjection.html;
    const tensorHost = document.querySelector('#tensor-host');
    tensorHost.replaceChildren();
    if (nextProjection.tensorHtml) { tensorHost.innerHTML = nextProjection.tensorHtml; enhanceSheetViews(tensorHost); }
    if (nextProjection.tensorError) {
        const diagnostic=document.createElement('p'); diagnostic.setAttribute('role','status');
        diagnostic.textContent=`Linked tensor unavailable; showing the last valid plane: ${nextProjection.tensorError}`;
        tensorHost.prepend(diagnostic);
    }
    const regions = replayRixCelDocument(documentLog).view.regions ?? {};
    const selector = document.querySelector('#region-select'), previousRegion = selector.value;
    selector.replaceChildren(new Option('Choose a region',''));
    for (const regionName of Object.keys(regions)) selector.add(new Option(regionName,regionName));
    selector.value = previousRegion;
    enhanceSheetViews(host, {
        onSelection(detail) {
            selectedIndex = [...detail.index];
            setStatus(detail.coordinateLabel || detail.address);
        },
        async onEdit(detail) {
            const event = {
                type: "slot:set",
                index: [...detail.index],
                source: detail.source,
                assignmentMode: detail.assignmentMode || ":=",
                view: {},
            };
            try {
                const result = await commitEvent(event);
                setTimeout(() => renderProjection(result), 0);
                return { type: "result", text: detail.source, revision: result.epoch };
            } catch (error) {
                documentLog = setRixCelDraft(documentLog, {
                    index: event.index,
                    source: event.source,
                    assignmentMode: event.assignmentMode,
                    kind: errorKind(error.message),
                    message: error.message,
                });
                dirty = true;
                persistRecovery();
                decorateDrafts();
                return { type: "error", text: error.message };
            }
        },
        async onBatchEdit(detail) {
            const event = {
                type: "slot:batch",
                edits: detail.edits.map((edit) => ({
                    index: [...edit.index],
                    source: edit.source,
                    assignmentMode: edit.assignmentMode || ":=",
                    view: {},
                })),
            };
            try {
                const result = await commitEvent(event);
                setTimeout(() => renderProjection(result), 0);
                return { type: "result", revision: result.epoch };
            } catch (error) {
                setStatus(error.message);
                return { type: "error", text: error.message };
            }
        },
        onHeaderEdit(detail) {
            commitEvent({
                type: "view:axis-label",
                axis: detail.axis,
                coordinate: detail.coordinate,
                label: detail.label || null,
            }).then((result) => renderProjection(result)).catch((error) => setStatus(error.message));
            return { type: "result" };
        },
    });
    decorateDrafts();
    updateHistoryButtons();
    updateWindowControls();
}

async function commitEvent(event) {
    if (pendingCommit) throw new Error("An edit is still being saved; try again when it finishes");
    pendingCommit = true;
    updateHistoryButtons();
    try {
    let next = documentLog;
    const edits = event.type === "slot:batch" ? event.edits : event.type === "slot:set" ? [event] : [];
    for (const edit of edits) next = clearRixCelDraft(next, edit.index);
    const candidate = appendRixCelEvent(next, event);
    const result = await evaluationWorker.request({ type: "commit", document: candidate, window: viewport });
    documentLog = candidate;
    workbookLog = result.workbook ?? null;
    dirty = true;
    persistRecovery();
    setStatus(event.type === "slot:batch"
        ? `Saved ${event.edits.length} cells locally · event ${documentLog.cursor} · epoch ${result.epoch}`
        : `Saved locally · event ${documentLog.cursor} · epoch ${result.epoch}`);
    return result;
    } finally { pendingCommit = false; updateHistoryButtons(); }
}

async function insertAxis(axis) {
    const coordinate = Math.min(selectedIndex[axis-1] || 1, documentLog.shape[axis-1]);
    const result = await commitEvent({ type: "axis:insert", axis, coordinate, count: 1 });
    renderProjection(result);
    setStatus(`Inserted ${axis===1?"row":"column"} ${coordinate}; references updated`);
}

function bindProjection(result, nextName, { resetSession = true } = {}) {
    documentLog = parseRixCelDocument(result.document);
    workbookLog = result.workbook ?? null;
    documentSelector.replaceChildren();
    documentSelector.hidden = !workbookLog;
    for (const record of workbookLog?.documents ?? []) {
        const option = document.createElement("option"); option.value=record.document.id; option.textContent=record.document.id;
        option.selected=record.document.id===documentLog.id; documentSelector.append(option);
    }
    name = nextName || "Untitled.rixcel";
    documentName.textContent = name;
    if (resetSession) sessionFloorCursor = 0; // Saved history remains undoable after restart/open.
    renderProjection(result);
    persistRecovery();
}

async function loadDocument(document, nextName, options = {}) {
    const result = await evaluationWorker.request({ type: "open", document, activeDocument:options.activeDocument, window: viewport });
    bindProjection(result, nextName, options);
}

async function importText(text, kind, nextName) {
    const header = headerToggle.checked;
    const id = (nextName || "imported").replace(/\.[^.]+$/u, "") || "imported";
    const result = await evaluationWorker.request({ type: "import", kind, text, header, id, window: viewport });
    bindProjection(result, nextName);
}

async function newDocument() {
    Object.assign(viewport, { rowStart: 1, columnStart: 1 });
    const document = createRixCelDocument({
        id: "untitled",
        shape: [20, 8],
        view: { axes: ["row", "column"] },
    });
    await loadDocument(document, "Untitled.rixcel");
    dirty = false;
    persistRecovery();
    setStatus("New sparse document");
}

function download(text, filename, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

function saveDocument() {
    download(savedText(), name, "application/json");
    dirty = false;
    persistRecovery();
    setStatus(`Saved document with ${documentLog.events.length} history events`);
}

async function exportDelimited(kind) {
    const result = await evaluationWorker.request({ type: "export", kind });
    const base = name.replace(/\.rixcel$/iu, "") || "sheet";
    download(result.text, `${base}.${kind}`, kind === "csv" ? "text/csv" : "text/tab-separated-values");
    setStatus(`Exported ${kind.toUpperCase()}`);
}

async function exportWorkbookXlsx() {
    const { exportXlsx } = await import('./xlsx-interchange.js');
    const snapshot = await evaluationWorker.request({ type: 'export-xlsx-snapshot' });
    const result = await exportXlsx(snapshot);
    download(result.bytes, `${name.replace(/\.[^.]+$/u, '')}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    setStatus(`Exported XLSX values. ${result.diagnostics.join(' ')}`);
}

async function openFile(file) {
    if (/\.xlsx$/iu.test(file.name)) {
        const { importXlsx, XLSX_LIMITS } = await import('./xlsx-interchange.js');
        if (file.size > XLSX_LIMITS.bytes) throw new Error('XLSX exceeds file size limit');
        const result = await importXlsx(await file.arrayBuffer(), { filename: file.name });
        Object.assign(viewport, { rowStart: 1, columnStart: 1 });
        await loadDocument(result.document, `${file.name.replace(/\.xlsx$/iu, '')}.rixbook`);
        dirty = false; persistRecovery();
        setStatus(`Opened ${file.name}. ${result.diagnostics.join(' ')}`);
        return;
    }
    const text = await file.text();
    const extension = file.name.split(".").at(-1)?.toLowerCase();
    const kind = ["rixcel","rixbook"].includes(extension) ? "rixcel" : extension === "tsv" ? "tsv" : "csv";
    Object.assign(viewport, { rowStart: 1, columnStart: 1 });
    await importText(text, kind, kind === "rixcel" ? file.name : `${file.name.replace(/\.[^.]+$/u, "")}.rixcel`);
    dirty = false;
    persistRecovery();
    setStatus(`Opened ${file.name}`);
}

async function restoreCursor(cursor) {
    if (pendingCommit) throw new Error("An edit is still being saved");
    if (!documentLog || cursor < sessionFloorCursor || cursor > documentLog.events.length) return;
    const undoing = cursor < documentLog.cursor;
    pendingCommit = true; updateHistoryButtons(); setStatus('Restoring history…');
    try {
        const candidate = setRixCelCursor(documentLog, cursor);
        const result = await evaluationWorker.request({ type: "commit", document: candidate, window: viewport });
        bindProjection(result, name, { resetSession: false });
        dirty = true; persistRecovery();
        setStatus(undoing ? "Undo restored" : "Redo restored");
    } finally { pendingCommit=false; updateHistoryButtons(); }
}

async function moveWindow(rowDelta, columnDelta) {
    viewport.rowStart = Math.max(1, viewport.rowStart + rowDelta);
    viewport.columnStart = Math.max(1, viewport.columnStart + columnDelta);
    renderProjection(await evaluationWorker.request({ type: "project", window: viewport }));
}

function confirmDocumentSwitch() {
    if (!dirty) return Promise.resolve("discard");
    if (!switchDialog?.showModal) {
        return Promise.resolve(confirm("Save the current RiXCel document before continuing?") ? "save" : "cancel");
    }
    switchDialog.showModal();
    return new Promise((resolve) => {
        switchDialog.addEventListener("close", () => resolve(switchDialog.returnValue || "cancel"), { once: true });
    });
}

async function allowDocumentSwitch() {
    const choice = await confirmDocumentSwitch();
    if (choice === "cancel") return false;
    if (choice === "save") saveDocument();
    return true;
}

function coordinates(id, optional = false) {
    const raw = document.querySelector(`#${id}`).value.trim();
    if (!raw && optional) return undefined;
    const values = raw.split(',').map(item => item.trim() === '_' ? null : Number(item.trim()));
    if (values.some(value => value !== null && (!Number.isSafeInteger(value) || value < 1))) throw new Error('Coordinates must be positive integers separated by commas');
    return values;
}

async function tensorAction(action) {
    if (pendingCommit) throw new Error('An edit is still being saved');
    pendingCommit = true; updateHistoryButtons();
    try {
        const options = {
            viewAxes: coordinates('tensor-axes'), slice: coordinates('tensor-slice', true),
            targetStart: coordinates('tensor-target'), targetAxes: coordinates('tensor-target-axes'),
        };
        const result = await evaluationWorker.request({type:action,source:document.querySelector('#tensor-source').value,options,window:viewport});
        if (action === 'tensor-snapshot') {
            documentLog = result.document; workbookLog = result.workbook ?? null; dirty = true; persistRecovery();
        }
        renderProjection(result);
        setStatus(action === 'tensor-snapshot' ? 'Tensor plane saved as exact values; undo restores the previous sheet' : action === 'tensor-link' ? 'Linked read-only tensor view; updates after sheet edits' : 'Linked view closed');
    } finally { pendingCommit=false; updateHistoryButtons(); }
}

async function regionAction(action) {
    if (action === 'region-selection') {
        document.querySelector('#region-start').value=selectedIndex.join(',');
        document.querySelector('#region-end').value=selectedIndex.join(',');
        return;
    }
    const start = coordinates('region-start'), end = coordinates('region-end');
    let event;
    if (action === 'region-format') {
        const choice = document.querySelector('#region-style').value;
        const styles = {bold:{bold:true},italic:{italic:true},highlight:{background:'#fff2b3'},right:{align:'right'},
            exact:{numberFormat:'exact'},decimal:{numberFormat:'decimal',precision:Number(document.querySelector('#region-precision').value)},
            clear:{bold:null,italic:null,background:null,color:null,align:null,numberFormat:null,precision:null}};
        event = {type:'view:format',start,end,style:styles[choice]};
    } else event = {type:'view:region',name:document.querySelector('#region-name').value,start:action==='region-delete'?null:start,end:action==='region-delete'?null:end};
    renderProjection(await commitEvent(event));
}

document.querySelector('#region-select').addEventListener('change', event => {
    const region = replayRixCelDocument(documentLog).view.regions?.[event.target.value];
    if (!region) return;
    document.querySelector('#region-name').value=event.target.value;
    document.querySelector('#region-start').value=region.start.join(',');
    document.querySelector('#region-end').value=region.end.join(',');
});

document.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (pendingCommit) { setStatus("An edit is still being saved"); return; }
    if (action === "insert-row" || action === "insert-column") {
        insertAxis(action === "insert-row" ? 1 : 2).catch(error=>setStatus(error.message));
        return;
    }
    if (!action) return;
    try {
        if (action.startsWith("tensor-")) await tensorAction(action);
        else if (action.startsWith("region-")) await regionAction(action);
        else if (action === "new") {
            if (await allowDocumentSwitch()) await newDocument();
        } else if (action === "open") {
            if (await allowDocumentSwitch()) fileInput.click();
        } else if (action === "save") saveDocument();
        else if (action === "export-csv") await exportDelimited("csv");
        else if (action === "export-xlsx") await exportWorkbookXlsx();
        else if (action === "export-tsv") await exportDelimited("tsv");
        else if (action === "undo") await restoreCursor(documentLog.cursor - 1);
        else if (action === "redo") await restoreCursor(documentLog.cursor + 1);
        else if (action === "previous-rows") await moveWindow(-viewport.rowCount, 0);
        else if (action === "next-rows") await moveWindow(viewport.rowCount, 0);
        else if (action === "previous-columns") await moveWindow(0, -viewport.columnCount);
        else if (action === "next-columns") await moveWindow(0, viewport.columnCount);
    } catch (error) {
        setStatus(error.message || String(error));
    }
});

fileInput.addEventListener("change", async () => {
    const [file] = fileInput.files || [];
    fileInput.value = "";
    if (!file) return;
    try {
        await openFile(file);
    } catch (error) {
        setStatus(error.message || String(error));
    }
});

documentSelector.addEventListener("change", async () => {
    if (pendingCommit) { documentSelector.value=documentLog.id; return; }
    // Keep failed source visible until corrected; it is not an executable workbook update.
    if (documentLog.drafts.length) { documentSelector.value=documentLog.id; setStatus("Resolve formula drafts before switching documents"); return; }
    try { const result=await evaluationWorker.request({type:"select-document",id:documentSelector.value,window:{...viewport,rowStart:1,columnStart:1}});bindProjection(result,name); }
    catch(error){documentSelector.value=documentLog.id;setStatus(error.message);}
});

window.addEventListener("beforeunload", (event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
});
window.addEventListener("pagehide", () => evaluationWorker.dispose(), { once: true });

try {
    const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY)
        || localStorage.getItem(LEGACY_STORAGE_KEY)
        || "null",
    );
    if (saved?.document) {
        await loadDocument(saved.document, saved.name, {activeDocument:saved.activeDocument});
        dirty = saved.dirty ?? true;
        persistRecovery();
        setStatus("Recovered local document");
    } else {
        await newDocument();
    }
} catch (error) {
    console.warn("RiXCel local recovery failed", error);
    await newDocument();
    setStatus("Local recovery failed; opened a new document");
}
