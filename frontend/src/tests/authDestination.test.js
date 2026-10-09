import {describe,it,expect} from 'vitest';
import {safeDestination} from '../state/authDestination.js';
describe('authentication return destinations',()=>{
 it('accepts known internal destinations',()=>{for(const path of ['/overview','/cloud','/portfolio','/graph'])expect(safeDestination(path)).toBe(path);});
 it('rejects external, encoded, credential-bearing and looping destinations',()=>{for(const path of [null,undefined,'https://evil.example','//evil.example','/\\evil.example','/%2f%2fevil.example','/auth','/auth/reset','/auth/callback','/cloud?token=secret','/cloud#token','/cloud/../auth',' /cloud','/missing'])expect(safeDestination(path)).toBe('/overview');});
});
