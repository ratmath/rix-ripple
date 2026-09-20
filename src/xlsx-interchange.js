/** Host-only, values-only XLSX interchange. Never calls a RiX/Excel evaluator. */
import ExcelJS from '@protobi/exceljs/dist/exceljs.min.js';
import { Unzip, UnzipInflate, zipSync } from 'fflate';
import { SaxesParser } from 'saxes';
import { createRixCelDocument, appendRixCelEvent } from '../../../rix/src/runtime/rixcel-document.js';
import { createRixCelWorkbookDocument } from '../../../rix/src/runtime/rixcel-workbook.js';

export const XLSX_LIMITS = Object.freeze({bytes:8_000_000, expandedBytes:24_000_000, entries:256, sheets:32, cells:4096, rows:1048576, columns:16384, text:32767});
const META='_RiXCel_values';
const fail=message=>{throw new Error(`XLSX: ${message}`);};
function limits(options={}) { return Object.fromEntries(Object.entries(XLSX_LIMITS).map(([key,max])=> {const n=options[key]??max;if(!Number.isSafeInteger(n)||n<1||n>max)fail(`invalid ${key} limit`);return [key,n];})); }
function boundedText(value,l) { if(typeof value!=='string'||value.length>l.text)fail('cell text exceeds limit');return value; }
function quote(value) {let width=2;for(const run of value.matchAll(/"+/g))width=Math.max(width,run[0].length+1);const q='"'.repeat(width);return `${q} ${value} ${q}.Slice(2,-1)`;}
function dimensions(shape,l) {if(!Array.isArray(shape)||shape.length!==2||shape.some((n,i)=>!Number.isSafeInteger(n)||n<1||n>(i?l.columns:l.rows)))fail('only bounded rank-two sheets are supported');return shape;}
// RiX does not use JavaScript e-notation. Expand the finite stored decimal into
// an exact integer/rational literal; this does not invent digits Excel discarded.
function numericSource(value) {
    const [mantissa,exponent='0']=String(value).split(/[eE]/);
    const fraction=mantissa.split('.')[1]?.length??0;
    const digits=BigInt(mantissa.replace('.','')).toString();
    const shift=Number(exponent)-fraction;
    return shift>=0 ? digits+'0'.repeat(shift) : `${digits}/1${'0'.repeat(-shift)}`;
}
function scalar(cell,l) {
    const {kind,value}=cell;
    if(kind==='integer') {if(typeof value!=='string'||!/^(-?[1-9][0-9]*|0)$/.test(value)||value.length>1024)fail('invalid exact integer');return value;}
    if(kind==='rational') {if(typeof value!=='string'||!/^(-?[1-9][0-9]*|0)\/[1-9][0-9]*$/.test(value)||value.length>2048)fail('invalid exact rational');return value;}
    if(kind==='number') {if(typeof value!=='number'||!Number.isFinite(value))fail('invalid numeric value');return numericSource(value);}
    if(kind==='boolean') {if(typeof value!=='boolean')fail('invalid boolean');return value?'1':'0';}
    if(kind==='blank')return '_';
    if(['string','date','error','formula','display'].includes(kind))return quote(boundedText(value,l));
    fail(`unsupported value kind ${kind}`);
}
function visible(cell,l,diagnostics) {
    scalar(cell,l);
    if(cell.kind==='blank')return null;
    if(cell.kind==='integer') {const n=Number(cell.value);if(Number.isSafeInteger(n)&&String(n).replace(/^\+/,'')===cell.value&&cell.value.replace('-','').length<=15)return n;diagnostics.add('Large exact integers are exported as text to prevent Excel precision loss.');return cell.value;}
    if(cell.kind==='rational') {diagnostics.add('Exact fractions are exported as text; Excel numeric cells cannot preserve arbitrary rational values.');return cell.value;}
    if(cell.kind==='display')diagnostics.add('Non-scalar mathematical values are exported as display text, without executable definitions.');
    return cell.value;
}

/** Inflate in small chunks and reject actual expanded sizes before any XML parser sees them. */
function checkedZip(input,l) {
    const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
    if(bytes.byteLength>l.bytes)fail('compressed file exceeds byte limit');
    const files=Object.create(null);let total=0,count=0,error=null;
    const unzip=new Unzip(file=>{
        if(++count>l.entries)fail('ZIP entry count exceeds limit');
        if(Object.hasOwn(files,file.name)||file.name.includes('..')||file.name.startsWith('/')||file.name.includes('\\'))fail('invalid ZIP entry path');
        if(file.originalSize>l.expandedBytes)fail('ZIP entry exceeds expanded byte limit');
        const chunks=[];files[file.name]=null;
        file.ondata=(err,data,final)=>{if(err){error=err;return;}total+=data.length;if(total>l.expandedBytes)fail('ZIP expanded byte limit exceeded');chunks.push(data);if(final){const result=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let pos=0;for(const chunk of chunks){result.set(chunk,pos);pos+=chunk.length;}files[file.name]=result;}};
        file.start();
    });
    unzip.register(UnzipInflate);
    try {for(let start=0;start<bytes.length;start+=1024)unzip.push(bytes.subarray(start,start+1024),start+1024>=bytes.length);}catch(e){fail(e.message);}
    if(error||!count||Object.values(files).some(v=>v===null))fail('invalid or incomplete ZIP');
    // Canonical, checked bytes prevent downstream ZIP readers interpreting a second directory.
    if(!files['xl/workbook.xml'])fail('not an XLSX workbook');
    if(Object.keys(files).some(name=>/vbaProject|externalLinks/i.test(name)))fail('macros and external workbook links are unsupported');
    const ranges=new Map(),relationships=new Map(),sheetLinks=[];let totalXmlCells=0;
    for(const [name,data] of Object.entries(files)) if(/\.xml$|\.rels$/i.test(name)) {
        const xml=new TextDecoder().decode(data),parser=new SaxesParser({xmlns:true});
        let cells=0,rows=0;
        const sheet=/^xl\/worksheets\/[^/]+\.xml$/.test(name);
        const address=value=>{const match=/^([A-Z]+)([1-9][0-9]*)$/.exec(value??'');if(!match)fail('invalid cell coordinate');const column=[...match[1]].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0),row=Number(match[2]);if(row>l.rows||column>l.columns)fail('cell coordinate exceeds limits');return [row,column];};
        parser.on('doctype',()=>fail('XML entities are unsupported'));
        parser.on('error',error=>fail(`invalid XML: ${error.message}`));
        parser.on('opentag',node=>{
            const attrs=Object.fromEntries(Object.values(node.attributes).map(a=>[a.local,a.value]));
            if(sheet&&node.local==='c'){if(++totalXmlCells>2*l.cells+l.sheets+1)fail('global cell limit exceeded');if(++cells>l.cells+l.sheets+1)fail('sheet cell limit exceeded');address(attrs.r);}
            if(sheet&&node.local==='row'){if(++rows>l.cells+l.sheets+1||!/^([1-9][0-9]*)$/.test(attrs.r??'')||Number(attrs.r)>l.rows)fail('row exceeds limits');}
            if(sheet&&node.local==='dimension') {const ends=(attrs.ref??'').split(':');if(ends.length>2)fail('invalid dimensions');const shape=address(ends.at(-1));ranges.set(name,shape);}
            if(name==='xl/workbook.xml'&&node.local==='sheet'){sheetLinks.push({name:attrs.name,id:attrs.id});if(sheetLinks.length>l.sheets+1)fail('sheet count exceeds limit');}
            if(name==='xl/_rels/workbook.xml.rels'&&node.local==='Relationship') {
                if(attrs.TargetMode==='External')fail('external workbook links are unsupported');
                const target=attrs.Target?.replace(/^\//,'');relationships.set(attrs.Id,target?.startsWith('xl/')?target:`xl/${target}`);
            }
        });
        parser.write(xml).close();
    }
    const shapes=new Map(sheetLinks.map(sheet=>[sheet.name,ranges.get(relationships.get(sheet.id))]));
    return {bytes:zipSync(files,{level:0}),shapes};
}

/** sheets: [{id,name,shape,cells:[{index,kind,value,source?,metadata?}]}]. */
export async function exportXlsx(snapshot,options={}) {
    const l=limits(options),diagnostics=new Set(),book=new ExcelJS.Workbook();
    if(!Array.isArray(snapshot.sheets)||!snapshot.sheets.length||snapshot.sheets.length>l.sheets)fail('sheet count exceeds limit');
    const meta=book.addWorksheet(META,{state:'veryHidden'});meta.getCell('A1').value='rixcel.xlsx.values@1';
    let count=0,metaRow=2;const used=new Set([META.toLowerCase()]);
    for(const [offset,sheet] of snapshot.sheets.entries()) {
        const shape=dimensions(sheet.shape,l);
        let name=String(sheet.name??sheet.id??`Sheet${offset+1}`).replace(/[\[\]:*?/\\]/g,'_').replace(/^'+|'+$/g,'').slice(0,31)||`Sheet${offset+1}`;
        const base=name;let suffix=1;while(used.has(name.toLowerCase()))name=`${base.slice(0,25)}_${suffix++}`;used.add(name.toLowerCase());
        const ws=book.addWorksheet(name);const seen=new Set();
        const header={kind:'sheet',sheet:name,id:String(sheet.id??name),shape,metadata:sheet.metadata??{}};
        meta.getCell(metaRow++,1).value=boundedText(JSON.stringify(header),l);
        if(!Array.isArray(sheet.cells))fail('expected sparse cells');
        for(const cell of sheet.cells) {
            if(++count>l.cells)fail('cell count exceeds limit');
            const [row,column]=cell.index??[];
            if(cell.index?.length!==2||!Number.isSafeInteger(row)||row<1||row>shape[0]||!Number.isSafeInteger(column)||column<1||column>shape[1]||seen.has(`${row},${column}`))fail('invalid or duplicate cell coordinate');
            seen.add(`${row},${column}`);
            const value=visible(cell,l,diagnostics);ws.getCell(row,column).value=value;
            const record={kind:'cell',sheet:name,index:[row,column],scalar:{kind:cell.kind,value:cell.value??null},visible:value,source:cell.source??null,metadata:cell.metadata??{}};
            meta.getCell(metaRow++,1).value=boundedText(JSON.stringify(record),l);
        }
    }
    if(metaRow>l.rows)fail('metadata row limit exceeded');
    const bytes=new Uint8Array(await book.xlsx.writeBuffer());
    if(bytes.length>l.bytes)fail('output exceeds byte limit');
    return {bytes,diagnostics:[...diagnostics]};
}

export async function importXlsx(input,options={}) {
    const l=limits(options),book=new ExcelJS.Workbook(),diagnostics=new Set(['Excel formulas are imported as inert text. Numeric cells contain Excel’s stored precision; lost digits cannot be recovered.']);
    const checked=checkedZip(input,l);
    await book.xlsx.load(checked.bytes,{ignoreNodes:['mergeCells','cols','dataValidations','conditionalFormatting','drawing','picture','extLst']});
    const metadata=new Map(),sheetMetadata=new Map(),hidden=book.getWorksheet(META);
    const ownMetadata=hidden?.getCell('A1').value==='rixcel.xlsx.values@1';
    if(ownMetadata)hidden.eachRow((row,index)=>{if(index===1)return;const raw=row.getCell(1).value;if(typeof raw!=='string'||raw.length>l.text)fail('invalid interchange metadata');let item;try{item=JSON.parse(raw);}catch{fail('invalid interchange metadata JSON');}if(item.kind==='sheet') {dimensions(item.shape,l);sheetMetadata.set(item.sheet,item);}else if(item.kind==='cell')metadata.set(`${item.sheet}:${item.index?.join(',')}`,item);else fail('unknown interchange metadata');});
    const sheets=[],records=[];let count=0;
    for(const ws of book.worksheets) {
        if(ws===hidden&&ownMetadata)continue;
        if(sheets.length>=l.sheets)fail('sheet count exceeds limit');
        const saved=sheetMetadata.get(ws.name);
        const shape=dimensions([Math.max(1,ws.rowCount,saved?.shape[0]??1,checked.shapes.get(ws.name)?.[0]??1),Math.max(1,ws.columnCount,saved?.shape[1]??1,checked.shapes.get(ws.name)?.[1]??1)],l);
        const cells=[];const edits=[];const occupied=new Set();
        ws.eachRow({includeEmpty:false},row=>row.eachCell({includeEmpty:false},excel=>{
            if(++count>l.cells)fail('cell count exceeds limit');
            let cell;const value=excel.value;
            if(value&&typeof value==='object'&&('formula'in value||'sharedFormula'in value))cell={kind:'formula',value:`=${excel.formula??value.formula??value.sharedFormula}`};
            else if(typeof value==='number')cell={kind:'number',value};
            else if(typeof value==='boolean')cell={kind:'boolean',value};
            else if(value instanceof Date)cell={kind:'date',value:value.toISOString()};
            else if(typeof value==='string')cell={kind:'string',value};
            else if(value?.error)cell={kind:'error',value:value.error};
            else if(value?.richText)cell={kind:'string',value:value.richText.map(part=>part.text).join('')};
            else if(value?.text!==undefined)cell={kind:'string',value:String(value.text)};
            else if(value===null)return;
            else fail(`unsupported cell ${ws.name}!${excel.address}`);
            const index=[excel.row,excel.col];occupied.add(index.join(','));const stored=metadata.get(`${ws.name}:${index.join(',')}`);
            let originalSource=null,extra={};
            if(stored&&JSON.stringify(stored.visible)===JSON.stringify(value)&&JSON.stringify(visible(stored.scalar,l,diagnostics))===JSON.stringify(stored.visible)) {
                scalar(stored.scalar,l);cell=stored.scalar;
                if(stored.source!==null&&typeof stored.source!=='string')fail('invalid source metadata');
                originalSource=stored.source;extra=stored.metadata??{};
            }else if(stored)diagnostics.add('Edited Excel cells use their visible values; stale exact-value metadata was ignored.');
            const source=scalar(cell,l);
            const cellMetadata={...extra,sourceFile:options.filename??null,sheet:ws.name,address:excel.address,originalSource,scalar:cell,importedSource:source};
            cells.push({index,...cell,source,metadata:cellMetadata});
            edits.push({index,source,assignmentMode:':=',view:{xlsx:cellMetadata}});
        }));
        // Explicit blank values can carry source metadata without an XML cell node.
        for(const stored of metadata.values())if(stored.sheet===ws.name&&stored.visible===null&&!occupied.has(stored.index?.join(','))) {
            const [row,column]=stored.index??[];
            if(stored.index?.length!==2||!Number.isSafeInteger(row)||row<1||row>shape[0]||!Number.isSafeInteger(column)||column<1||column>shape[1])fail('invalid blank metadata coordinate');
            if(stored.scalar?.kind!=='blank')fail('invalid blank metadata');
            if(++count>l.cells)fail('cell count exceeds limit');
            const source='_',cellMetadata={sourceFile:options.filename??null,sheet:ws.name,originalSource:stored.source??null,scalar:{kind:'blank',value:null},importedSource:source};
            cells.push({index:stored.index,kind:'blank',value:null,source,metadata:cellMetadata});
            edits.push({index:stored.index,source,assignmentMode:':=',view:{xlsx:cellMetadata}});
        }
        const id=`xlsx-${sheets.length+1}`;
        let document=createRixCelDocument({id,shape,view:{title:ws.name,axes:['row','column'],xlsx:{sourceFile:options.filename??null,sheet:ws.name,originalId:saved?.id??null,metadata:saved?.metadata??{}}}});
        if(edits.length)document=appendRixCelEvent(document,{type:'slot:batch',edits});
        sheets.push({id,name:ws.name,shape,cells,metadata:document.view.xlsx});records.push({document,names:{},exports:{},imports:{}});
    }
    if(!records.length)fail('no value worksheets found');
    return {document:createRixCelWorkbookDocument(records),sheets,diagnostics:[...diagnostics]};
}
