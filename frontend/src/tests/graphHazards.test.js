import {it,expect} from 'vitest';
import {layoutGraph} from '../services/graph.js';
import {graphSubset,pathHighlight} from '../services/graphView.js';
import {regionGeometry,modeledEvents,hazardTargets} from '../services/hazards.js';
const ring=[[77,19],[78,19],[78,20],[77,19]];
it('dense layout reserves card heights deterministically and is independent of input order',()=>{
 const nodes=Array.from({length:60},(_,i)=>({id:'c'+i,kind:'company',label:'Very long company label '.repeat(i%4+1),height:100+i%3*50}));
 const placed=layoutGraph(nodes,[]);expect(placed).toEqual(layoutGraph([...nodes].reverse(),[]));
 for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++)expect(placed[j].position.y).toBeGreaterThanOrEqual(placed[i].position.y+placed[i].height+48);
});
it('directed layers retain upstream/downstream direction',()=>{
 const nodes=['supplier','customer'].map(id=>({id,kind:'company',label:id}));
 const p=layoutGraph(nodes,[{sourceId:'supplier',targetId:'customer',commercialHop:true}]);
 expect(p.find(n=>n.id==='customer').position.x).toBeGreaterThan(p.find(n=>n.id==='supplier').position.x);
});
it('path priority keeps context and highlights exact directed IDs without parallel or reverse guesses',()=>{
 const nodes=['a','b','c','background'].map(id=>({id,kind:'company'}));
 const edges=[{id:'ab',sourceId:'a',targetId:'b',commercialHop:true},{id:'parallel',sourceId:'a',targetId:'b',commercialHop:true},{id:'reverse',sourceId:'b',targetId:'a',commercialHop:true},{id:'bc',sourceId:'b',targetId:'c',commercialHop:true}];
 const path={companyIds:['a','b'],edgeIds:['ab','reverse']};
 const subset=graphSubset({nodes,edges},nodes,null,{path});
 expect(subset.nodes).toHaveLength(4);expect(subset.edges).toHaveLength(4);
 expect([...pathHighlight(path,nodes,edges).edgeIds]).toEqual(['ab']);
 expect([...pathHighlight(null,nodes,edges).nodeIds]).toEqual([]);
});
it('accepts closed Polygon/MultiPolygon/Feature geometry, rejects unsupported or invalid rings',()=>{
 for(const boundary of [{type:'Polygon',coordinates:[ring]},{type:'MultiPolygon',coordinates:[[ring],[ring]]},{type:'Feature',geometry:{type:'Polygon',coordinates:[ring]}}])expect(regionGeometry({boundary}).type).toBe('boundary');
 for(const boundary of [{type:'Polygon',coordinates:[ring.slice(0,3)]},{type:'Polygon',coordinates:[[[181,0],[0,0],[0,1],[181,0]]]},{type:'Point',coordinates:[77,19]},[77,19,78,20]])expect(regionGeometry({boundary}).type).toBe('unavailable');
});
it('centroids are bounded longitude/latitude points with no inferred footprint or radius',()=>{
 expect(regionGeometry({centroid:[0,0]})).toEqual({type:'centroid',geometry:{type:'Point',coordinates:[0,0]}});
 expect(regionGeometry({centroid:[20,100]}).type).toBe('unavailable');
 expect(regionGeometry({boundary:null,centroid:null}).type).toBe('unavailable');
});
it('deduplicates target IDs, preserves unknown/synthetic provenance and missing geometry notices',()=>{
 const d={datasetVersion:'v',regions:[{id:'a',name:'A',provenance:'synthetic',centroid:[77,19]},{id:'b',provenance:'unknown',boundary:null}]};
 const view=hazardTargets(d,[{id:'event',datasetVersion:'v',geographicTargets:['a','a','b','missing'],hazardType:'heat',intensity:null}], 'event');
 expect(view.targets).toHaveLength(3);expect(view.targets[0].text).toContain('geography synthetic');expect(view.targets[0].text).toContain('no hazard footprint or radius');expect(view.targets[1].text).toContain('geography unknown');expect(view.targets[2].type).toBe('unavailable');
 expect(hazardTargets(d,[],'missing').notice).toContain('unavailable');
 expect(hazardTargets(d,[{id:'e',geographicTargets:[]}],'e').notice).toContain('no geographic target');
});
it('saved event snapshot and versioned source are authoritative, without current-event fallback',()=>{
 const d={datasetVersion:'old',events:[{id:'e',intensity:.8}]},saved={id:'e',intensity:.37,datasetVersion:'old',geographicTargets:[]};
 expect(modeledEvents(d,{eventIds:['e'],eventOverrides:{e:.9}},{eventSnapshot:[saved]})).toEqual([saved]);
 expect(modeledEvents(d,{eventIds:['e']},{eventSnapshot:null})).toEqual([]);
 expect(hazardTargets({datasetVersion:'new',regions:[]},[saved],'e').notice).toContain('does not match');
 expect(modeledEvents(d,{eventIds:['e'],eventOverrides:{e:0}})[0]).toMatchObject({intensity:0,provenance:'assumed'});expect(d.events[0].intensity).toBe(.8);
});

it('incomplete private event records show unavailable without substituting installed events',()=>{
 const d={datasetVersion:'v',events:[{id:'current'}],regions:[]};
 expect(modeledEvents(d,{eventIds:['current']},{eventSnapshot:[null,{},'invalid']})).toEqual([]);
 expect(hazardTargets(d,[{id:'historical'}],'historical').notice).toContain('unavailable');
});
