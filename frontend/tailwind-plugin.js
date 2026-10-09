// Use Tailwind's pure compiler to avoid Node ESM reload hooks that hang on this host.
// No package code is patched. Utility candidates come only from this project's source.
import { compile } from 'tailwindcss';
import { createRequire } from 'node:module';
import { readFile,readdir } from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const virtualId='virtual:meghdrishti-tailwind.css';
export default function tailwind(){
  let root;
  return {
    name:'meghdrishti-tailwind-compiler',
    configResolved(config){root=config.root;},
    resolveId(id){if(id===virtualId)return '\0'+virtualId;},
    async load(id){
      if(id!=='\0'+virtualId)return;
      const candidates=new Set();
      const scan=async directory=>{
        for(const entry of await readdir(directory,{withFileTypes:true})){
          const file=path.join(directory,entry.name);
          if(entry.isDirectory())await scan(file);
          else if(/\.(jsx?|html)$/.test(file)){
            this.addWatchFile(file);
            for(const token of (await readFile(file,'utf8')).match(/[^\s"'`<>]+/g)||[])candidates.add(token);
          }
        }
      };
      await scan(path.join(root,'src'));
      const compiler=await compile('@import "tailwindcss";',{base:root,loadStylesheet:async(id,base)=>{
        const file=id==='tailwindcss'?require.resolve('tailwindcss/index.css'):path.resolve(base,id);
        this.addWatchFile(file);
        return {path:file,base:path.dirname(file),content:await readFile(file,'utf8')};
      }});
      return compiler.build([...candidates]);
    },
    handleHotUpdate({file,server}){
      if(file.startsWith(path.join(root,'src'))&&/\.jsx?$/.test(file)){
        const module=server.moduleGraph.getModuleById('\0'+virtualId);
        if(module)server.moduleGraph.invalidateModule(module);
      }
    },
  };
}
