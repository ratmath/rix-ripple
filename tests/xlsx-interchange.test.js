import {test,expect} from 'bun:test';
import ExcelJS from '@protobi/exceljs/dist/exceljs.min.js';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {exportXlsx,importXlsx} from '../src/xlsx-interchange.js';
import {RixCelEvaluationSession} from '../src/evaluation-runtime.js';
import {createRixCelDocument,appendRixCelEvent} from '../../../rix/src/runtime/rixcel-document.js';
const fixture=()=>({sheets:[{id:'exact',name:'Exact',shape:[1000000,12],metadata:{author:'fixture'},cells:[
 {index:[1,1],kind:'integer',value:'9007199254740993',source:'9007199254740992+1'},
 {index:[2,2],kind:'rational',value:'1/3',source:'2/6'},
 {index:[3,2],kind:'string',value:'=WEBSERVICE("https://invalid.example")'},
 {index:[7,5],kind:'boolean',value:true},
 {index:[8,5],kind:'date',value:'2026-09-20T00:00:00.000Z'},
]},{id:'other',name:'Second',shape:[3,4],cells:[{index:[1,1],kind:'number',value:0.1}]}]});
async function excelBytes(configure){const book=new ExcelJS.Workbook();await configure(book);return new Uint8Array(await book.xlsx.writeBuffer());}
function rewrite(bytes,name,fn){const files=unzipSync(bytes);files[name]=strToU8(fn(strFromU8(files[name])));return zipSync(files);}

test('exact sparse values, dimensions, sheet order, source and metadata round trip',async()=>{
 const out=await exportXlsx(fixture());expect(out.diagnostics).toHaveLength(2);
 const result=await importXlsx(out.bytes,{filename:'exact.xlsx'});
 expect(result.sheets.map(s=>s.name)).toEqual(['Exact','Second']);expect(result.sheets[0].shape).toEqual([1000000,12]);
 expect(result.sheets[0].cells.map(c=>[c.index,c.kind,c.value])).toEqual(fixture().sheets[0].cells.map(c=>[c.index,c.kind,c.value]));
 expect(result.sheets[0].cells[0].metadata.originalSource).toBe('9007199254740992+1');
 expect(result.document.documents[0].document.view.xlsx.metadata.author).toBe('fixture');
 expect(result.document.documents[0].document.events).toHaveLength(1);
 const session=new RixCelEvaluationSession();session.open(result.document);
 expect(String(session.model.get([1,1]))).toBe('9007199254740993');expect(String(session.model.get([2,2]))).toBe('1/3');
 const snapshot=session.exportXlsxSnapshot();expect(snapshot.sheets[0].cells[3].kind).toBe('boolean');session.dispose();
 const again=await importXlsx((await exportXlsx(snapshot)).bytes);expect(again.sheets[0].cells[1].value).toBe('1/3');
});

test('Excel and metadata source formulas remain inert, including quotes and line breaks',async()=>{
 const bytes=await excelBytes(book=>{const sheet=book.addWorksheet('Untrusted');sheet.getCell('A1').value={formula:'WEBSERVICE("https://invalid.example")',result:55};sheet.getCell('B1').value='"""; .ImportJS("file");\n';});
 const result=await importXlsx(bytes);expect(result.sheets[0].cells[0].kind).toBe('formula');
 const session=new RixCelEvaluationSession();session.open(result.document);expect(session.model.get([1,1]).value).toBe('=WEBSERVICE("https://invalid.example")');expect(session.model.get([1,2]).value).toBe('"""; .ImportJS("file");\n');
 const output=await exportXlsx(session.exportXlsxSnapshot());const book=new ExcelJS.Workbook();await book.xlsx.load(output.bytes);expect(typeof book.getWorksheet('Untrusted').getCell('A1').value).toBe('string');session.dispose();
 const own=fixture();own.sheets[0].cells[0].source='.ImportJS("file")';const imported=await importXlsx((await exportXlsx(own)).bytes);expect(imported.sheets[0].cells[0].source).toBe('9007199254740993');
});

test('edits in Excel invalidate stale exact-value metadata',async()=>{
 const {bytes}=await exportXlsx(fixture());const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);book.getWorksheet('Exact').getCell('A1').value=42;
 const result=await importXlsx(await book.xlsx.writeBuffer());expect(result.sheets[0].cells[0].value).toBe(42);expect(result.sheets[0].cells[0].kind).toBe('number');expect(result.diagnostics.join(' ')).toContain('stale');
});

test('foreign dimensions, rich text, dates, errors and booleans are values only',async()=>{
 let bytes=await excelBytes(book=>{const s=book.addWorksheet('Foreign');s.getCell('A1').value={richText:[{text:'Hello '},{text:'world'}]};s.getCell('B1').value=new Date('2020-01-01T00:00:00Z');s.getCell('C1').value={error:'#DIV/0!'};s.getCell('D1').value=false;});
 bytes=rewrite(bytes,'xl/worksheets/sheet1.xml',xml=>xml.replace('ref="A1:D1"','ref="A1:Z1000000"'));
 const result=await importXlsx(bytes);expect(result.sheets[0].shape).toEqual([1000000,26]);expect(result.sheets[0].cells.map(c=>c.kind)).toEqual(['string','date','error','boolean']);
});

test('sparse million-row snapshot never expands empty defaults',async()=>{
 const doc=appendRixCelEvent(createRixCelDocument({id:'huge',shape:[1000000,10000]}),{type:'slot:set',index:[999999,9000],source:'7/3'});
 const session=new RixCelEvaluationSession();session.open(doc);const snap=session.exportXlsxSnapshot();expect(snap.sheets[0].cells).toHaveLength(1);
 const result=await importXlsx((await exportXlsx(snap)).bytes);expect(result.sheets[0].shape).toEqual([1000000,10000]);expect(result.sheets[0].cells[0].index).toEqual([999999,9000]);session.dispose();
});

test('nonblank defaults are fully materialized only within the snapshot limit',()=>{
 const session=new RixCelEvaluationSession();session.open(createRixCelDocument({id:'defaults',shape:[2,2],defaultSlot:{source:'row+col',assignmentMode:':='}}));expect(session.exportXlsxSnapshot().sheets[0].cells.map(c=>c.value)).toEqual(['2','3','3','4']);
 session.open(createRixCelDocument({id:'large',shape:[1000000,1],defaultSlot:{source:'row',assignmentMode:':='}}));expect(()=>session.exportXlsxSnapshot()).toThrow('nonblank default');session.dispose();
});

test('rejects compressed/expanded ZIP, entry and sparse cell limits',async()=>{
 const {bytes}=await exportXlsx(fixture());await expect(importXlsx(bytes,{bytes:100})).rejects.toThrow('byte limit');await expect(importXlsx(bytes,{expandedBytes:500})).rejects.toThrow('byte limit');await expect(importXlsx(bytes,{entries:2})).rejects.toThrow('entry count');await expect(importXlsx(bytes,{cells:2})).rejects.toThrow('cell');
 await expect(exportXlsx(fixture(),{cells:2})).rejects.toThrow('cell count');
 const extra=unzipSync(bytes);extra['huge.txt']=strToU8('a'.repeat(100000));await expect(importXlsx(zipSync(extra),{expandedBytes:20000})).rejects.toThrow('expanded');
});

test('rejects invalid coordinate/dimension/DTD/external links before ExcelJS allocation',async()=>{
 const bytes=await excelBytes(book=>book.addWorksheet('Sheet').getCell('A1').value=1);
 for(const [from,to] of [['r="A1"','r="XFE1"'],['r="A1"','r="A1048577"']]) {
  const changed=rewrite(bytes,'xl/worksheets/sheet1.xml',xml=>xml.replace(from,to));await expect(importXlsx(changed)).rejects.toThrow('coordinate');
 }
 const entity=rewrite(bytes,'xl/workbook.xml',xml=>xml.replace(/<workbook/,'<!DOCTYPE x [<!ENTITY a "bad">]><workbook'));await expect(importXlsx(entity)).rejects.toThrow('entities');
 const files=unzipSync(bytes);files['xl/externalLinks/externalLink1.xml']=strToU8('<x/>');await expect(importXlsx(zipSync(files))).rejects.toThrow('external');
});

test('merged regions and formatting do not expand huge rectangles',async()=>{
 let bytes=await excelBytes(book=>book.addWorksheet('Merge').getCell('A1').value=1);
 bytes=rewrite(bytes,'xl/worksheets/sheet1.xml',xml=>xml.replace('</worksheet>','<mergeCells count="1"><mergeCell ref="A1:XFD1048576"/></mergeCells></worksheet>'));
 const result=await importXlsx(bytes);expect(result.sheets[0].cells).toHaveLength(1);
});

test('rejects malformed scalar metadata instead of evaluating injected source',async()=>{
 const {bytes}=await exportXlsx(fixture());const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);const cell=book.getWorksheet('_RiXCel_values').getCell('A3');const record=JSON.parse(cell.value);record.scalar={kind:'integer',value:'1; .ImportJS("file")'};cell.value=JSON.stringify(record);
 await expect(importXlsx(await book.xlsx.writeBuffer())).rejects.toThrow('invalid exact integer');
});

test('rejects rank-N, oversized text, duplicate coordinates and invalid lowered limits',async()=>{
 await expect(exportXlsx({sheets:[{id:'bad',shape:[2,2,2],cells:[]}]})).rejects.toThrow('rank-two');
 await expect(exportXlsx({sheets:[{id:'bad',shape:[2,2],cells:[{index:[1,1],kind:'string',value:'x'.repeat(32768)}]}]})).rejects.toThrow('text');
 const snapshot=fixture();snapshot.sheets[0].cells.push(snapshot.sheets[0].cells[0]);await expect(exportXlsx(snapshot)).rejects.toThrow('duplicate');
 await expect(importXlsx(new Uint8Array(),{cells:Infinity})).rejects.toThrow('invalid cells');
});

test('blank values retain inert source metadata and trailing dimensions',async()=>{
 const result=await importXlsx((await exportXlsx({sheets:[{id:'blank',shape:[99,42],cells:[{index:[2,3],kind:'blank',value:null,source:'_ ## intentionally blank'}]}]})).bytes);
 expect(result.sheets[0].shape).toEqual([99,42]);expect(result.sheets[0].cells[0].metadata.originalSource).toBe('_ ## intentionally blank');expect(result.sheets[0].cells[0].source).toBe('_');
});
test('oversized foreign declared dimensions are rejected',async()=>{
 const bytes=await excelBytes(book=>book.addWorksheet('Sheet').getCell('A1').value=1);
 const changed=rewrite(bytes,'xl/worksheets/sheet1.xml',xml=>xml.replace(/<dimension[^>]*\/>/,'<dimension ref="A1:XFE1048577"/>'));
 await expect(importXlsx(changed)).rejects.toThrow('coordinate');
});

test('global cell count is checked before loading many worksheets',async()=>{
 const bytes=await excelBytes(book=>{for(let i=0;i<4;i++){const ws=book.addWorksheet(`S${i}`);for(let j=1;j<=10;j++)ws.getCell(j,1).value=j;}});
 await expect(importXlsx(bytes,{cells:10,sheets:4})).rejects.toThrow('global cell');
});
test('shared Excel formulas are inert text and ignore cached results',async()=>{
 const bytes=await excelBytes(book=>{const ws=book.addWorksheet('Shared');ws.getCell('A1').value={formula:'1+1',result:2,shareType:'shared',ref:'A1:A2'};ws.getCell('A2').value={sharedFormula:'A1',result:2};});
 const result=await importXlsx(bytes);expect(result.sheets[0].cells.map(c=>[c.kind,c.value])).toEqual([['formula','=1+1'],['formula','=1+1']]);
});

test('forged hidden scalar cannot override its inconsistent visible value',async()=>{
 const {bytes}=await exportXlsx({sheets:[{id:'one',shape:[1,1],cells:[{index:[1,1],kind:'integer',value:'1'}]}]});
 const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);const cell=book.getWorksheet('_RiXCel_values').getCell('A3');const record=JSON.parse(cell.value);record.scalar.value='999';cell.value=JSON.stringify(record);
 const result=await importXlsx(await book.xlsx.writeBuffer());expect(result.sheets[0].cells[0].value).toBe(1);expect(result.sheets[0].cells[0].kind).toBe('number');expect(result.diagnostics.join(' ')).toContain('stale');
});

test('scientific-notation Excel numbers become exact RiX constants',async()=>{
 const values=[1e21,1e-7,-1.2e-30,-0,0.1,Number.MIN_VALUE,Number.MAX_VALUE];
 const bytes=await excelBytes(book=>{const sheet=book.addWorksheet('Scientific');values.forEach((value,index)=>sheet.getCell(index+1,1).value=value);});
 const result=await importXlsx(bytes);const session=new RixCelEvaluationSession();session.open(result.document);
 expect(String(session.model.get([1,1]))).toBe('1000000000000000000000');expect(String(session.model.get([2,1]))).toBe('1/10000000');
 expect(String(session.model.get([3,1]))).toBe('-3/2500000000000000000000000000000');expect(String(session.model.get([4,1]))).toBe('0');expect(String(session.model.get([5,1]))).toBe('1/10');
 expect(String(session.model.get([6,1]))).toContain('/');expect(String(session.model.get([7,1]))).toHaveLength(309);session.dispose();
});
