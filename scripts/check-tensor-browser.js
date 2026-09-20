// C4 real editor: exact snapshots, collision atomicity, linked updates and formatting.
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
const output=path.resolve(import.meta.dir,'../../../tmp/c4-cel-browser');await mkdir(output,{recursive:true});
const root=path.join(output,'site');
const build=Bun.spawn(['bun',path.resolve(import.meta.dir,'build.js')],{env:{...process.env,RIXCEL_BUILD_DIR:root},stdout:'inherit',stderr:'inherit'});assert.equal(await build.exited,0);
const server=Bun.serve({hostname:'127.0.0.1',port:0,async fetch(request){const pathname=new URL(request.url).pathname;const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)||!await Bun.file(file).exists())return new Response(null,{status:pathname==='/favicon.ico'?204:404});return new Response(Bun.file(file));}});
let context, page, stage="startup";
try {
 const {chromium}=await import(process.env.RIX_PLAYWRIGHT_MODULE||'playwright');
 context=await chromium.launchPersistentContext(path.join(output,'profile-'+Date.now()),{headless:true,...(process.env.RIX_CHROME_EXECUTABLE?{executablePath:process.env.RIX_CHROME_EXECUTABLE}:{})});
 page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.port}/`);await page.locator('#sheet-host td[data-rix-address="grid[1,1]"]').waitFor();
 await page.locator('summary').click();
 await page.locator('#tensor-source').fill('.Shaped.Generate({: 2,2,2 }, idx -> idx[1]*100+idx[2]*10+idx[3])');
 await page.locator('#tensor-axes').fill('2,3');await page.locator('#tensor-slice').fill('1,_,_');
 await page.locator('[data-action="tensor-link"]').click();await page.locator('#tensor-host td').filter({hasText:'111'}).waitFor();
 await page.locator('#tensor-slice').fill('2,_,_');await page.locator('[data-action="tensor-link"]').click();await page.locator('#tensor-host td').filter({hasText:'211'}).waitFor();
 await page.locator('#tensor-source').fill('{:2x2: 1/3,2/3;3,4}');await page.locator('#tensor-axes').fill('1,2');await page.locator('#tensor-slice').fill('');
 await page.locator('[data-action="tensor-unlink"]').click();await page.locator('#status').filter({hasText:'Linked view closed'}).waitFor();
 await page.locator('[data-action="tensor-snapshot"]').click();
 await page.locator('#status').filter({hasText:'Tensor plane saved'}).waitFor();
 const cell=page.locator('#sheet-host td[data-rix-address="grid[1,1]"]');assert.equal((await cell.innerText()).trim(),'1/3');
 await page.locator('[data-action="tensor-snapshot"]').click();await page.locator('#status').filter({hasText:'collision'}).waitFor();assert.equal((await cell.innerText()).trim(),'1/3');
 await page.locator('#tensor-source').fill('{:1x1: document[1,1]*2}');await page.locator('[data-action="tensor-link"]').click();
 await page.locator('#tensor-host td').filter({hasText:'2/3'}).waitFor();
 assert.equal(await page.locator('#tensor-host [data-rix-editable="true"]').count(),0);
 stage='region'; await page.locator('#region-end').fill('2,2');await page.locator('#region-name').fill('totals');
 await page.locator('[data-action="region-save"]').click();await page.waitForFunction(()=>[...document.querySelector('#region-select').options].some(o=>o.value==='totals'));
 stage='bold'; await page.locator('[data-action="region-format"]').click();await page.waitForFunction(()=>document.querySelector('#sheet-host td[data-rix-address="grid[1,1]"]').style.fontWeight==='bold');
 stage='decimal'; await page.locator('#region-style').selectOption('decimal');await page.locator('#region-precision').fill('2');await page.locator('[data-action="region-format"]').click();
 await page.waitForFunction(()=>document.querySelector('#sheet-host td[data-rix-address="grid[1,1]"]').textContent.includes('0.33'));
 // Undo style, name and original snapshot; the linked readonly view must refresh.
 stage="undo"; for(let i=0;i<4;i++){await page.locator('[data-action="undo"]').click();await page.locator('#status').filter({hasText:'Undo restored'}).waitFor();await page.waitForTimeout(100);}
 await page.waitForFunction(()=>document.querySelector('#tensor-host')?.textContent.includes('unavailable')||!document.querySelector('#sheet-host td[data-rix-address="grid[1,1]"]')?.textContent.trim());
 await page.locator('[data-action="redo"]').click();await page.locator('#status').filter({hasText:'Redo restored'}).waitFor();
 assert.equal((await cell.innerText()).trim(),'1/3');
 await page.locator('#tensor-host td').filter({hasText:'2/3'}).waitFor();
 await page.locator('#sheet-host td[data-rix-address="grid[20,8]"]').scrollIntoViewIfNeeded();
 assert.notEqual(await page.evaluate(()=>getComputedStyle(document.documentElement).overflow),'hidden');
 assert.deepEqual(errors,[]);await page.screenshot({path:path.join(output,'tensor-tools.png'),fullPage:true});
 console.log('C4 browser snapshot, collision, linked view, regions, formatting and undo/redo passed');
} catch(error) {console.error('Stage',stage,'status',await page?.locator('#status').innerText());await page?.screenshot({path:path.join(output,'failure.png'),fullPage:true});throw error;} finally {await context?.close();server.stop(true);}
