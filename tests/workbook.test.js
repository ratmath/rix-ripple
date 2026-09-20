import {expect,test} from 'bun:test';
import {Integer,Rational} from '@ratmath/core';
import {createRixCelDocument,appendRixCelEvent,createRixCelWorkbookDocument,parseRixCelWorkbook,formatValue,setRixCelCursor} from '../../../rix/src/index.js';
import {encodeMathematicalJSON} from '../../../rix/src/runtime/math-json.js';
import {createRixCelWorkbookHost} from '../src/workbook-runtime.js';
const doc=(id,source,shape=[2,2])=>appendRixCelEvent(createRixCelDocument({id,shape}),{type:'slot:set',index:shape.map(()=>1),source});
const spec=()=>createRixCelWorkbookDocument([
 {document:doc('sales','7/3'),exports:{subtotal:{index:[1,1]}}},
 {document:doc('report','imports.Get(:subtotal)*(1+names.Get(:tax))'),names:{tax:{source:'1/10'}},imports:{subtotal:{document:'sales',export:'subtotal'}},exports:{total:{index:[1,1]},direct:{source:'book.Get(:sales,:subtotal)'}}}
]);
const show=(book,id,name)=>formatValue(book.get(id,name));
test('explicit owned exports, names and imports share one exact atomic epoch',()=>{
 const book=createRixCelWorkbookHost(spec());expect(show(book,'report','total')).toBe('2..17/30');expect(show(book,'report','direct')).toBe('2..1/3');
 const events=[];book.subscribe(e=>events.push([e.epoch,show(book,'sales','subtotal'),show(book,'report','total')]));
 book.transaction([{id:'sales',document:doc('sales','10')},{id:'report',names:{tax:{source:'1/4'}}}]);
 expect(events).toEqual([[2,'10','12..1/2']]);expect(book.epoch).toBe(2);expect(book.work.evaluations).toBe(book.work.nodes);
 expect(book.sheet('report').slot([1,1]).dependencies).toContain('report.imports.subtotal');
 const source=book.export();source.documents[0].exports.subtotal.index[0]=2;expect(show(book,'sales','subtotal')).toBe('10');
 book.dispose();
});
test('failure and complete cross-document/import/name cycle paths leave every prior value and epoch unchanged',()=>{
 const book=createRixCelWorkbookHost(spec()),before=book.export();let notifications=0;book.subscribe(()=>notifications++);
 expect(()=>book.transaction([{id:'sales',document:doc('sales','30')},{id:'report',names:{tax:{source:'Missing()'}}}])).toThrow();
 expect(book.export()).toEqual(before);expect(book.epoch).toBe(1);expect(show(book,'sales','subtotal')).toBe('2..1/3');expect(notifications).toBe(0);
 expect(()=>book.transaction([{id:'sales',document:doc('sales','imports.Get(:again)'),imports:{again:{document:'report',export:'total'}}}])).toThrow(/sales\.exports\.subtotal.*sales\.grid\[1,1\].*sales\.imports\.again.*report\.exports\.total.*report\.grid\[1,1\].*report\.imports\.subtotal.*sales\.exports\.subtotal/);
 expect(book.export()).toEqual(before);expect(show(book,'report','total')).toBe('2..17/30');
 expect(()=>book.transaction([{id:'report',names:{tax:{name:'tax'}}}])).toThrow(/report.names.tax.*report.names.tax/);
 book.dispose();
});
test('namespaces expose only named exports and reject caller access, missing owners and mutation',()=>{
 const book=createRixCelWorkbookHost(spec());
 for(const source of ['@secret','.RNG()', '.Config', '.Plugin.Load(:data)', 'book.Get(:sales,:private)','imports.Get(:tax)','names.Get(:subtotal)']) expect(()=>book.edit('report',{type:'slot:set',index:[1,1],source})).toThrow();
 expect(()=>parseRixCelWorkbook({...spec(),documents:[...spec().documents,spec().documents[0]]})).toThrow('duplicate');
 expect(()=>book.transaction([{id:'report',imports:{x:{document:'missing',export:'x'}}}])).toThrow('missing owned export');
 book.dispose();expect(()=>book.get('report','total')).toThrow('disposed');
});
test('rank-N materialization stays bounded and stable export slots follow structural insert/undo',()=>{
 const document=doc('cube','3/7',[1000,1000,2]);const book=createRixCelWorkbookHost(createRixCelWorkbookDocument([{document,exports:{answer:{index:[1,1,1]}}}]));
 const sheet=book.sheet('cube'),id=sheet.slot([1,1,1]).id;
 book.edit('cube',{type:'axis:insert',axis:1,coordinate:1});expect(show(book,'cube','answer')).toBe('3/7');expect(sheet.slot([2,1,1]).id).toBe(id);
 book.transaction([{id:'cube',document:setRixCelCursor(book.export().documents[0].document,1)}]);expect(sheet.shape).toEqual([1000,1000,2]);expect(sheet.slot([1,1,1]).id).toBe(id);
 const count=book.epoch;book.materialize('cube',[[2,2,2],[3,3,2]]);expect(book.epoch).toBe(count+1);expect(sheet.get([3,3,2])).toBeNull();expect(sheet.materializedSlotCount).toBeLessThan(10);
 book.dispose();
});
test('work and evaluator limits reject candidates without publishing partial states',()=>{
 const book=createRixCelWorkbookHost(spec(),{limits:{nodes:12,maxSteps:3000}});const previous=book.export();
 expect(()=>book.edit('report',{type:'slot:set',index:[1,1],source:'{@::@ i=0; 1; i; i+=1 };'})).toThrow('3000-step limit');expect(book.export()).toEqual(previous);
 expect(()=>book.materialize('sales',Array(20).fill([2,2]))).toThrow('budget');expect(book.epoch).toBe(1);book.dispose();
});
function externalSpec(){return createRixCelWorkbookDocument([{document:doc('live','imports.Get(:rate)*3'),imports:{rate:{external:'rates'}},exports:{answer:{index:[1,1]}}}],{rates:{value:encodeMathematicalJSON(new Rational(1n,3n)),metadata:{source:'manual-fixture',version:'v1'}}});}
test('external sources are inert exact snapshots; refresh is explicit and preserves provenance',async()=>{
 let calls=0;const book=createRixCelWorkbookHost(externalSpec(),{providers:{rates:async()=>{calls++;return {value:new Rational(2n,3n),metadata:{source:'manual-fixture',version:'v2'}}}}});
 expect(calls).toBe(0);expect(show(book,'live','answer')).toBe('1');expect(()=>book.schedule('rates',1000)).toThrow('host policy');
 await book.refresh('rates');expect(calls).toBe(1);expect(show(book,'live','answer')).toBe('2');expect(book.getExternal('rates').metadata.version).toBe('v2');
 const restored=createRixCelWorkbookHost(parseRixCelWorkbook(JSON.stringify(book.export())));expect(show(restored,'live','answer')).toBe('2');expect(calls).toBe(1);book.dispose();restored.dispose();
});
test('stale, failed, timed-out and disposed refreshes cannot replace a newer workbook',async()=>{
 let resolve;const book=createRixCelWorkbookHost(externalSpec(),{providers:{rates:()=>new Promise(r=>resolve=r)}});
 const pending=book.refresh('rates');await Promise.resolve();book.edit('live',{type:'slot:set',index:[1,1],source:'9'});resolve({value:new Integer(4n),metadata:{source:'test',version:'v2'}});await expect(pending).rejects.toThrow('stale');expect(show(book,'live','answer')).toBe('9');
 const pending2=book.refresh('rates');await Promise.resolve();book.dispose();await expect(pending2).rejects.toThrow('disposed');
 const timeout=createRixCelWorkbookHost(externalSpec(),{limits:{refreshTimeMs:5},providers:{rates:()=>new Promise(()=>{})}});await expect(timeout.refresh('rates')).rejects.toThrow('time budget');expect(show(timeout,'live','answer')).toBe('1');timeout.dispose();
});
test('scheduled refresh is host opt-in and disposal cancels all timers',async()=>{
 const timers=new Map();let next=0;const clock={setInterval(callback){timers.set(++next,callback);return next;},clearInterval(id){timers.delete(id);}};
 const book=createRixCelWorkbookHost(externalSpec(),{hostPolicy:{allowScheduledRefresh:true},clock,providers:{rates:async()=>({value:new Integer(2n),metadata:{source:'clock',version:'v2'}})}});
 expect(()=>book.schedule('rates',2**40)).toThrow('2147483647');
 book.schedule('rates',1000);expect(timers.size).toBe(1);const committed=new Promise(resolve=>book.subscribe(resolve));[...timers.values()][0]();await committed;expect(show(book,'live','answer')).toBe('6');book.dispose();expect(timers.size).toBe(0);
});
test('failed metadata refresh and reentrant mutations retain an atomic committed snapshot',async()=>{
 const book=createRixCelWorkbookHost(externalSpec(),{providers:{rates:async()=>({value:new Integer(9n),metadata:{source:'bad'}})}});
 await expect(book.refresh('rates')).rejects.toThrow('version');expect(show(book,'live','answer')).toBe('1');expect(book.epoch).toBe(1);
 let observed;book.subscribe(()=>{expect(()=>book.edit('live',{type:'slot:set',index:[1,1],source:'99'})).toThrow('nested');observed=show(book,'live','answer');});
 book.edit('live',{type:'slot:set',index:[1,1],source:'7'});expect(observed).toBe('7');expect(book.epoch).toBe(2);book.dispose();
});
test('namespace and slot results cannot mutate committed values through returned collections',()=>{
 const book=createRixCelWorkbookHost(createRixCelWorkbookDocument([{document:doc('copy','[1/3,2/3]'),exports:{value:{index:[1,1]}}}]));
 const value=book.get('copy','value');value.values[0]=new Integer(99n);expect(show(book,'copy','value')).toBe('[1/3, 2/3]');
 expect(()=>book.edit('copy',{type:'slot:set',index:[1,2],source:'near[_,0]'})).toThrow('exact integers');expect(book.epoch).toBe(1);book.dispose();
});
