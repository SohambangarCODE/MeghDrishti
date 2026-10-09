const destinations=new Set(['/overview','/cloud','/portfolio','/graph','/locations','/scenarios','/compare','/evidence','/reports']);
const queryKeys={'/graph':new Set(['entity','run']),'/locations':new Set(['entity']),'/compare':new Set(['run'])};
export function isWorkspacePath(path){const normalized=path.replace(/\/+$/,'').toLowerCase();return destinations.has(normalized)||/^\/results\/[^/]+$/.test(normalized);}
export function safeDestination(value){
 if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\s#]/.test(value))return '/overview';
 try{
  const url=new URL(value,'https://workspace.invalid');
  if(url.origin!=='https://workspace.invalid'||!isWorkspacePath(url.pathname)||value.split('?')[0]!==url.pathname)return '/overview';
  if(url.pathname.startsWith('/results/')&&!/^\/results\/[A-Za-z0-9_-]{1,128}$/.test(url.pathname))return '/overview';
  const seen=new Set();
  for(const [key,id] of url.searchParams){if(!queryKeys[url.pathname]?.has(key)||seen.has(key)||! /^[A-Za-z0-9:._-]{1,160}$/.test(id))return '/overview';seen.add(key);}
  return url.pathname+url.search;
 }catch{return '/overview';}
}
