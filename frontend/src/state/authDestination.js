const destinations=new Set(['/overview','/cloud','/portfolio','/graph','/locations','/scenarios','/compare','/evidence','/reports']);
export function safeDestination(value){return typeof value==='string'&&destinations.has(value)?value:'/overview';}
