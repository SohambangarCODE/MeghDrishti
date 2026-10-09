import {describe,it,expect} from 'vitest';
import {safeDestination,isWorkspacePath} from '../state/authDestination.js';
describe('authentication return destinations',()=>{
 it('guards route variants and arbitrary result parameters',()=>{for(const path of ['/overview/','/Overview','/results/%E2%82%B9','/results/123/'])expect(isWorkspacePath(path)).toBe(true);for(const path of ['/welcome','/auth','/auth/reset'])expect(isWorkspacePath(path)).toBe(false);});
 it('accepts known internal destinations',()=>{for(const path of ['/overview','/cloud','/portfolio','/graph'])expect(safeDestination(path)).toBe(path);});
 it('preserves result IDs and allowed query parameters',()=>{for(const path of ['/results/123','/graph?run=report-123&entity=demo%3Aaster','/locations?entity=demo-route-01','/compare?run=report-123'])expect(safeDestination(path)).toBe(path);});
 it('rejects external, encoded, credential-bearing and looping destinations',()=>{for(const path of [null,undefined,'https://evil.example','//evil.example','/\\evil.example','/%2f%2fevil.example','/auth','/auth/reset','/auth/callback','/cloud?token=secret','/cloud#token','/cloud/../auth',' /cloud','/missing'])expect(safeDestination(path)).toBe('/overview');});
});
