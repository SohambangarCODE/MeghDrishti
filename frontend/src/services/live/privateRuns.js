import {z} from 'zod';
import {StoredRun} from '../../state/history.js';
const PrivateRun=StoredRun.extend({ownerId:z.string().min(1),storage:z.literal('private Supabase snapshot'),completedAt:z.string()});
export function validatePrivateRun(result,ownerId,id=null){
 if(result.schemaVersion!=='1.0.0')throw new Error('Unsupported private report response.');
 const run=PrivateRun.parse(result.run);
 if(run.ownerId!==ownerId||id&&run.id!==id)throw new Error('Private report does not belong to this session or selection.');
 return run;
}
export function requireSavedPortfolio(workspace){
 if(workspace.isDirty)throw new Error('Save your unsaved portfolio changes before analyzing.');
 if(!workspace.activePortfolioId||!workspace.lastSavedAt)throw new Error('Save or open a private portfolio before analyzing.');
}
