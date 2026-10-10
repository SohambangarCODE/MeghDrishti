import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolveGraphEntity,graphSubset,graphLimitations} from '../services/graphView.js';
import {geometryStyle,facilitiesForView,viewportKey} from '../services/mapView.js';
const mixed=JSON.parse(readFileSync(new URL('../../../backend/tests/fixtures/coverage-cases.json',import.meta.url),'utf8')).mixed;
const nodes=Array.from({length:100},(_,i)=>({id:'c'+i,kind:'company',label:'Company '+i}));
const link=(id,sourceId,targetId)=>({id,sourceId,targetId,commercialHop:true});
describe('selection-aware graph presentation',()=>{
 it('resolves exact URL IDs from this snapshot, rejects invalid, absent and ambiguous IDs',()=>{
  expect(resolveGraphEntity(nodes,'c90').entity).toBe(nodes[90]);
  for(const id of ['', ' ', '\n', 'c999', 'c90 ', 'x'.repeat(513)])expect(resolveGraphEntity(nodes,id).error).toBeTruthy();
  expect(resolveGraphEntity(nodes,null).error).toBeNull();
  expect(resolveGraphEntity([...nodes,nodes[90]],'c90').entity).toBeNull();
  expect(resolveGraphEntity([{id:'001'}],'001').entity.id).toBe('001');
  expect(resolveGraphEntity([{id:'private-only'}],'c90').entity).toBeNull();
 });
 it('prioritizes target outside first 40 and both directed neighbors even outside filters',()=>{
  const edges=[link('in','c80','c90'),link('out','c90','c91'),link('between','c91','c80')];
  const result=graphSubset({nodes,edges},nodes.slice(0,40),nodes[90]);
  expect(result.nodes.slice(0,3).map(n=>n.id)).toEqual(['c90','c80','c91']);
  expect(result.edges).toEqual(edges);expect(result.nodes).toHaveLength(40);
  expect(result.neighborhood).toEqual(['c90','c80','c91']);
 });
 it('expands large neighborhoods without duplicate nodes or edges and ignores commodity hops',()=>{
  const edges=nodes.filter(n=>n.id!=='c90').map((n,i)=>link('e'+i,n.id,'c90'));
  const result=graphSubset({nodes:[...nodes,nodes[0],{id:'visual',kind:'commodity'}],edges:[...edges,edges[0],{id:'context',sourceId:'c90',targetId:'visual',commercialHop:false}]},[],nodes[90]);
  expect(result.nodes).toHaveLength(100);expect(new Set(result.nodes.map(n=>n.id)).size).toBe(100);
  expect(result.edges).toHaveLength(99);expect(result.neighborhood).toHaveLength(100);
 });
 it('keeps background filters and parallel edges available for path fading',()=>{
  const edges=[link('a','c0','c1'),link('b','c1','c0')];
  expect(graphSubset({nodes,edges},nodes.slice(0,2),null,{path:{companyIds:['c0','c1'],edgeIds:['a']}}).edges).toEqual(edges);
  expect(graphSubset({nodes,edges},[],null).nodes).toEqual([]);
 });
 it('discloses pagination, partial source records, dangling endpoints and unknown real completeness',()=>{
  const data={nodes,edges:[]};
  for(const sourceMetadata of [{partial:true},{relationshipsComplete:false},{pagination:{hasMore:true}},{pagination:{nextCursor:'next'}}])expect(graphLimitations(data,{sourceMetadata})).toContain('partial');
  expect(graphLimitations({nodes,edges:[link('missing','unknown','c0')]},{})).toContain('partial');
  expect(graphLimitations(data,{})).toContain('completeness is unknown');
 });
});
describe('map geography and evidence presentation',()=>{
 it('limits global facilities explicitly but returns all selected-company records',()=>{
  const facilities=Array.from({length:75},(_,i)=>({id:'f'+i,companyId:i<65?'c':'other'}));
  expect(facilitiesForView({facilities},null)).toHaveLength(50);
  expect(facilitiesForView({facilities},'c')).toHaveLength(65);
  expect(facilitiesForView({facilities},'absent')).toEqual([]);
 });
 it('keeps equivalent bounds stable, handles zero/single points, and detects focus/geography changes',()=>{
  expect(viewportKey([[1,2],[3,4]],'c')).toBe(viewportKey([[3,4],[1,2],[1,2]],'c'));
  expect(viewportKey([],null)).toContain('empty');expect(viewportKey([[1,2]])).toBe('[1,1,2,2,""]');
  expect(viewportKey([[1,2]],'a')).not.toBe(viewportKey([[1,2]],'b'));
  expect(viewportKey([[2,2]],'a')).not.toBe(viewportKey([[1,2]],'a'));
 });
 it('requires claim-specific evidence for solid routes and filled sites; generic links stay unknown',()=>{
  expect(geometryStyle(mixed.facilities[0],'facility',mixed)).toMatchObject({status:'sourced',dashArray:null,fillOpacity:1});
  expect(geometryStyle(mixed.facilities[2],'facility',mixed)).toMatchObject({status:'synthetic',dashArray:'6 5',fillOpacity:0});
  expect(geometryStyle(mixed.facilities[1],'facility',mixed).status).toBe('unknown');
  const route=mixed.routes.find(r=>r.id==='route-a');
  expect(geometryStyle(route,'route',mixed)).toMatchObject({status:'sourced',dashArray:null});
  expect(geometryStyle({...route,sourceFields:null},'route',mixed)).toMatchObject({status:'unknown',dashArray:'1 5'});
  expect(geometryStyle(mixed.routes.find(r=>r.id==='route-b'),'route',mixed)).toMatchObject({status:'synthetic',dashArray:'6 5'});
  expect(geometryStyle({...route,provenance:'assumed'},'route',mixed).status).toBe('synthetic');
 });
});
