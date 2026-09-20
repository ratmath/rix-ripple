// Real browser values-only XLSX import, sparse projection and download roundtrip.
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import {exportXlsx,importXlsx} from '../src/xlsx-interchange.js';
const output=path.resolve(import.meta.dir,'../../../tmp/c3-xlsx-browser');await mkdir(output,{recursive:true});
const root=path.join(output,'site');
const build=Bun.spawn(['bun',path.resolve(import.meta.dir,'build.js')],{env:{...process.env,RIXCEL_BUILD_DIR:root},stdout:'inherit',stderr:'inherit'});assert.equal(await build.exited,0);
const fixture=await exportXlsx({sheets:[{id:'numbers',name:'Numbers',shape:[1000000,12],cells:[{index:[1,1],kind:'rational',value:'1/3'},{index:[1,2],kind:'integer',value:'9007199254740993'}]},{id:'formulas',name:'Inert',shape:[2,2],cells:[{index:[1,1],kind:'formula',value:'=WEBSERVICE("https://invalid.example")'}]}]});
const server=Bun.serve({hostname:'127.0.0.1',port:0,async fetch(request){const pathname=new URL(request.url).pathname;const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)||!await Bun.file(file).exists())return new Response(null,{status:pathname==='/favicon.ico'?204:404});return new Response(Bun.file(file));}});
let context;
try {
 const {chromium}=await import(process.env.RIX_PLAYWRIGHT_MODULE||'playwright');
 context=await chromium.launchPersistentContext(path.join(output,'profile-'+Date.now()),{headless:true,acceptDownloads:true,...(process.env.RIX_CHROME_EXECUTABLE?{executablePath:process.env.RIX_CHROME_EXECUTABLE}:{})});
 const page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.port}/`);await page.locator('td[data-rix-address="grid[1,1]"]').waitFor();
 await page.locator('#file-input').setInputFiles({name:'fixture.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(fixture.bytes)});
 await page.locator('#status').filter({hasText:'Opened fixture.xlsx'}).waitFor();
 assert.equal((await page.locator('td[data-rix-address="grid[1,1]"]').innerText()).trim(),'1/3');assert.equal((await page.locator('td[data-rix-address="grid[1,2]"]').innerText()).trim(),'9007199254740993');
 assert.match(await page.locator('#window-status').innerText(),/1000000/);
 await page.locator('#workbook-document').selectOption('xlsx-2');await page.waitForFunction(()=>document.querySelector('td[data-rix-address="grid[1,1]"]')?.textContent.includes('WEBSERVICE'));
 const pending=page.waitForEvent('download');await page.locator('[data-action="export-xlsx"]').click();const download=await pending;const saved=path.join(output,'roundtrip.xlsx');await download.saveAs(saved);
 const result=await importXlsx(await Bun.file(saved).arrayBuffer());assert.equal(result.sheets[0].cells[0].value,'1/3');assert.equal(result.sheets[0].cells[1].value,'9007199254740993');assert.equal(result.sheets[1].cells[0].kind,'formula');assert.deepEqual(errors,[]);
 await page.screenshot({path:path.join(output,'xlsx.png'),fullPage:true});console.log('C3 XLSX browser import, sparse sheet selection, inert formula and exact download roundtrip passed');
} finally {await context?.close();server.stop(true);}
