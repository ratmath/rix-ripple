import { Integer, Rational } from '@ratmath/core';
import { formatValue } from '../../../rix/src/eval/format.js';
import { replayRixCelDocument } from '../../../rix/src/runtime/rixcel-document.js';

/** Sparse, structured-cloneable values for the host XLSX adapter. */
export function snapshotXlsxDocument(document,model,{maxCells=4096,format=formatValue,prepare=()=>{}}={}) {
    if(document.shape.length!==2)throw new Error('XLSX requires a rank-two document; materialize a plane into a separate document');
    const {slots}=replayRixCelDocument(document);
    // A nonblank default represents computed values at every coordinate, not empty space.
    if(document.defaultSlot.source.trim()!=='_') {
        if(document.shape[0]*document.shape[1]>maxCells)throw new Error('XLSX nonblank default exceeds cell limit');
        const explicit=new Map(slots.map(slot=>[slot.index.join(','),slot]));
        for(let row=1;row<=document.shape[0];row++)for(let column=1;column<=document.shape[1];column++)if(!explicit.has(`${row},${column}`))slots.push({index:[row,column],...document.defaultSlot});
    }
    if(slots.length>maxCells)throw new Error('XLSX cell count exceeds limit');
    prepare(slots.map(slot=>slot.index));
    const cells=slots.map(slot=>{
        const value=model.get(slot.index);let scalar;
        if(value===null)scalar={kind:'blank',value:null};
        else if(value instanceof Integer)scalar={kind:'integer',value:String(value.value)};
        else if(value instanceof Rational)scalar={kind:'rational',value:`${value.numerator}/${value.denominator}`};
        else if(value?.type==='string')scalar={kind:'string',value:value.value};
        else scalar={kind:'display',value:format(value)};
        const imported=slot.view?.xlsx;
        // A value-only XLSX import carries original scalar type (boolean/date/formula).
        // Reuse it only while the current constant source is unchanged.
        if(imported?.importedSource===slot.source&&imported.scalar)scalar=imported.scalar;
        return {index:slot.index,...scalar,source:slot.source,metadata:slot.view??{}};
    });
    return {id:document.id,name:document.view?.title??document.id,shape:[...document.shape],cells,metadata:document.view??{}};
}
