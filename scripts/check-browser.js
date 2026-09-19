// Real Chromium acceptance; uses a host-installed Playwright/Chromium or explicit paths.
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir,readFile} from 'node:fs/promises';
import {createRixCelDocument,appendRixCelEvent,stringifyRixCelDocument} from '../../../rix/src/index.js';
const output=path.resolve(import.meta.dir,'../../../tmp/c1-browser');await mkdir(output,{recursive:true});
const root=path.join(output,'site');
const build=Bun.spawn(['bun',path.resolve(import.meta.dir,'build.js')],{env:{...process.env,RIXCEL_BUILD_DIR:root},stdout:'inherit',stderr:'inherit'});
assert.equal(await build.exited,0);
const server=Bun.serve({hostname:'127.0.0.1',port:0,async fetch(request){const pathname=new URL(request.url).pathname;const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)||!await Bun.file(file).exists())return new Response(null,{status:pathname==='/favicon.ico'?204:404});return new Response(Bun.file(file));}});
let context;
try{
 const {chromium}=await import(process.env.RIX_PLAYWRIGHT_MODULE||'playwright');
 context=await chromium.launchPersistentContext(path.join(output,'profile-'+Date.now()),{headless:true,acceptDownloads:true,...(process.env.RIX_CHROME_EXECUTABLE?{executablePath:process.env.RIX_CHROME_EXECUTABLE}:{})});
 const page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());
 const cell=(row,col)=>page.locator(`td[data-rix-address="grid[${row},${col}]"]`);
 const action=name=>page.locator(`[data-action="${name}"]`);
 const history=()=>page.evaluate(()=>JSON.parse(JSON.parse(localStorage.getItem('rixcel.autosave.v2')).document));
 async function settled(cursor){console.log('Waiting for event',cursor);try{await page.waitForFunction(n=>{try{return JSON.parse(JSON.parse(localStorage.getItem('rixcel.autosave.v2')).document).cursor===n}catch{return false}},cursor);await page.waitForTimeout(60);}catch(error){console.log(await page.locator('body').innerText());console.log(await history());throw error;}}
 async function edit(row,col,source){const before=(await history()).cursor;await cell(row,col).click();await page.locator('[data-rix-edit-source]').fill(source);await page.locator('[data-rix-edit-source]').press('Enter');await settled(before+1);}
 await page.goto(`http://127.0.0.1:${server.port}/`);await cell(1,1).waitFor();
 await edit(1,1,'2/3');await edit(2,2,'grid[1,1]*3');assert.equal((await cell(2,2).innerText()).trim(),'2');
 const id=await cell(2,2).getAttribute('data-rix-slot-id');
 await cell(2,2).click();await action('insert-row').click();await settled(3);assert.equal((await history()).shape[0],21);assert.equal(await cell(3,2).getAttribute('data-rix-formula-source'),'grid[1,1]*3');
 if(id)assert.equal(await cell(3,2).getAttribute('data-rix-slot-id'),id);
 await cell(3,2).click();await action('insert-column').click();await settled(4);assert.equal((await cell(3,3).innerText()).trim(),'2');
 await action('undo').click();await settled(3);assert.equal((await history()).shape[1],8);
 await action('redo').click();await settled(4);assert.equal((await history()).shape[1],9);
 // Fill a selected two-cell block in one history event.
 await cell(1,1).click();await cell(2,1).click({modifiers:['Shift']});await cell(2,1).press('Control+d');await settled(5);assert.equal((await cell(2,1).innerText()).trim(),'2/3');
 // Copy uses actual editor copy/paste handlers with the browser clipboard payload.
 const copied=await cell(1,1).evaluate(el=>{const data=new DataTransfer();el.dispatchEvent(new ClipboardEvent('copy',{clipboardData:data,bubbles:true,cancelable:true}));return Object.fromEntries(data.types.map(type=>[type,data.getData(type)]));});
 await cell(4,1).evaluate((el,payload)=>{const data=new DataTransfer();for(const [type,value]of Object.entries(payload))data.setData(type,value);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},copied);await settled(6);assert.equal((await cell(4,1).innerText()).trim(),'2/3');
 // Failed formulas keep the last good value and recover on correction.
 await cell(1,1).click();await page.locator('[data-rix-edit-source]').fill('1+');await page.locator('[data-rix-edit-source]').press('Enter');await page.waitForFunction(()=>document.querySelector('td[data-rix-address="grid[1,1]"]')?.getAttribute('aria-invalid')==='true');assert.equal((await history()).cursor,6);assert.equal((await cell(1,1).innerText()).trim(),'2/3');
 await edit(1,1,'5/7');assert.equal((await history()).drafts.length,0);
 const downloadPromise=page.waitForEvent('download');await action('save').click();const download=await downloadPromise;const saved=path.join(output,'saved.rixcel');await download.saveAs(saved);const savedDoc=JSON.parse(await readFile(saved,'utf8'));assert.equal(savedDoc.version,3);
 await page.reload();await cell(1,1).waitFor();assert.equal((await cell(1,1).innerText()).trim(),'5/7');await action('undo').click();await settled(6);assert.equal((await cell(1,1).innerText()).trim(),'2/3');
 await page.locator('#file-input').setInputFiles(saved);await settled(7);assert.equal((await cell(1,1).innerText()).trim(),'5/7');
 // Open a large sparse sheet and navigate without a dense DOM/model.
 let huge=createRixCelDocument({id:'large',shape:[10000,10000]});huge=appendRixCelEvent(huge,{type:'slot:set',index:[41,13],source:'11/13'});
 const hugePath=path.join(output,'large.rixcel');await Bun.write(hugePath,stringifyRixCelDocument(huge));await page.locator('#file-input').setInputFiles(hugePath);await settled(1);await action('next-rows').click();await page.waitForFunction(()=>document.querySelector('#window-status')?.textContent.includes('Rows 41'));await action('next-columns').click();await cell(41,13).waitFor();assert.equal((await cell(41,13).innerText()).trim(),'11/13');assert.ok(await page.locator('td[data-rix-address]').count()<=480);
 assert.deepEqual(errors,[]);await page.screenshot({path:path.join(output,'verified.png')});
 console.log('C1 browser acceptance passed: exact editing, row/column insertion, fill/copy, draft recovery, save/reopen/restart, persistent undo/redo, bounded sparse navigation.');
}finally{await context?.close();server.stop(true);}
