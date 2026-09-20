import { test, expect } from 'bun:test';
import { createRixCelDocument, appendRixCelEvent, setRixCelCursor, replayRixCelDocument } from '../../../rix/src/index.js';
import { RixCelEvaluationSession } from '../src/evaluation-runtime.js';

test('worker snapshots a selected tensor plane atomically and restores history', () => {
  const session=new RixCelEvaluationSession().open(createRixCelDocument({shape:[4,4]}));
  const result=session.handle({type:'tensor-snapshot',source:'.Shaped.Generate({: 2,2,2 }, idx -> idx[1]*100+idx[2]*10+idx[3])',options:{viewAxes:[2,3],slice:[2,null,null],targetStart:[2,2]}});
  expect(result.document.events).toHaveLength(1);
  expect(result.document.events[0].edits.map(edit=>edit.source)).toEqual(['211','212','221','222']);
  const saved=JSON.stringify(session.document);
  expect(()=>session.handle({type:'tensor-snapshot',source:'{:2x2: 1,2;3,4}',options:{targetStart:[2,2]}})).toThrow('collision');
  expect(JSON.stringify(session.document)).toBe(saved);
  expect(()=>session.handle({type:'tensor-snapshot',source:'{:2x2: 1,2;3,4}',options:{targetStart:[4,4]}})).toThrow('fit');
  expect(JSON.stringify(session.document)).toBe(saved);
  session.commit(setRixCelCursor(session.document,0));
  expect(session.model.get([2,2])).toBeNull();
});

test('linked views update after edits, reject invalid replacements and cannot mutate the sheet', () => {
  let document=createRixCelDocument({shape:[2,2]});
  document=appendRixCelEvent(document,{type:'slot:set',index:[1,1],source:'1/3'});
  const session=new RixCelEvaluationSession().open(document);
  const linked=session.handle({type:'tensor-link',source:'{:1x1: document[1,1]*2}'});
  expect(linked.tensorHtml).toContain('2/3');
  expect(linked.tensorHtml).not.toContain('data-rix-editable="true"');
  session.commit(appendRixCelEvent(session.document,{type:'slot:set',index:[1,1],source:'2/3'}));
  expect(session.project().tensorHtml).toContain('1..1/3');
  expect(()=>session.handle({type:'tensor-link',source:'3'})).toThrow('finite Shaped');
  expect(session.project().tensorHtml).toContain('1..1/3');
  expect(()=>session.handle({type:'tensor-snapshot',source:'document.SetSource(1,1,"999"); {:1x1: 1}'})).toThrow();
  expect(String(session.model.get([1,1]))).toBe('2/3');
  session.commit(appendRixCelEvent(session.document,{type:'slot:set',index:[1,1],source:'"text"'}));
  const failed=session.project();
  expect(failed.tensorError).toBeTruthy();
  expect(failed.tensorHtml).toContain('1..1/3');
});

test('rank-N regions and block styles are one-event undoable editor changes', () => {
  const session=new RixCelEvaluationSession().open(createRixCelDocument({shape:[2,2,2]}));
  session.commit(appendRixCelEvent(session.document,{type:'view:region',name:'totals',start:[1,1,2],end:[2,2,2]}));
  session.commit(appendRixCelEvent(session.document,{type:'view:format',start:[1,1,2],end:[2,2,2],style:{bold:true,background:'#fff2b3'}}));
  expect(replayRixCelDocument(session.document).view.regions.totals).toEqual({start:[1,1,2],end:[2,2,2]});
  expect(session.project().html).toContain('font-weight');
  const saved=JSON.stringify(session.document);
  expect(()=>session.commit(appendRixCelEvent(session.document,{type:'view:region',name:'bad',start:[1,1],end:[2,2]}))).toThrow();
  expect(JSON.stringify(session.document)).toBe(saved);
  session.commit(setRixCelCursor(session.document,1));
  expect(replayRixCelDocument(session.document).view.formats ?? []).toHaveLength(0);
});
