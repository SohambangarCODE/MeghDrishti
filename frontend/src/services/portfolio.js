import Papa from 'papaparse';
import { normalizeHoldings } from '../engine/demo/simulate.js';

export function parseAmount(text) {
  if (typeof text==='number' && Number.isFinite(text) && text>=0) return text;
  if (typeof text!=='string' || !/^(?:\d+\.?\d*|\.\d+)$/.test(text.trim())) throw new Error('Enter a non-negative finite INR amount');
  const amount=Number(text);
  if (!Number.isFinite(amount)||amount>Number.MAX_SAFE_INTEGER) throw new Error('Amount exceeds supported numeric range');
  return amount;
}
export function matchCompany(row,companies) {
  const clean=x=>String(x??'').trim().toLocaleLowerCase('en');
  const key=clean(row.companyId||row.ticker||row.name);
  const candidates=companies.filter(c=>row.companyId?clean(c.id)===key:row.ticker?clean(c.ticker)===key&&(!row.exchange||clean(c.exchange)===clean(row.exchange)):clean(c.name)===key);
  return {matchingStatus:candidates.length===1?'matched':candidates.length?'ambiguous':'unmatched',companyId:candidates.length===1?candidates[0].id:null,candidates};
}
export function previewCsv(text,companies) {
  if (new TextEncoder().encode(text).length>1024*1024) throw new Error('CSV limit is 1 MB');
  const result=Papa.parse(text,{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim()});
  if (result.errors.length) throw new Error(`Invalid CSV: ${result.errors.map(e=>e.message).join('; ')}`);
  if (result.data.length>1000) throw new Error('CSV limit is 1,000 rows');
  if (!result.meta.fields?.includes('amount') || !result.meta.fields.some(k=>['name','ticker','companyId'].includes(k))) throw new Error('CSV needs amount and name, ticker, or companyId columns');
  if (!result.data.length) throw new Error('CSV contains no holdings');
  const rows=result.data.map((row,index)=>{
    const match=matchCompany(row,companies);const errors=[];let amount=null;
    try {amount=parseAmount(row.amount);} catch(e) {errors.push(e.message);}
    if ((row.currency?.trim()||'INR')!=='INR') errors.push('Only INR is supported; no implicit FX conversion');
    return {id:`import:${index}`,portfolioId:'demo:portfolio',originalInputName:row.name||row.ticker||row.companyId||'Unnamed record',
      ...match,amount,currency:row.currency?.trim()||'INR',exclusionReason:null,errors};
  });
  return {rows,errors:rows.flatMap((r,i)=>r.errors.map(message=>({row:i+2,message})))};
}
export function commitPreview(rows,companies) {
  if (rows.some(r=>r.errors?.length)) throw new Error('Resolve invalid amounts and currency before importing');
  if (rows.some(r=>r.matchingStatus==='unmatched'||r.matchingStatus==='ambiguous')) throw new Error('Match each record or explicitly exclude it before importing');
  return normalizeHoldings(rows,companies);
}
