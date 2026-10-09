import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { loadEnvFile } from 'node:process';
const require=createRequire(import.meta.url);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const backendEnv=path.join(root,'backend','.env.local');
if(existsSync(backendEnv))loadEnvFile(backendEnv);
const python=path.join(root,'backend','.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
if(!existsSync(python)){console.error('Create backend/.venv and install backend/requirements.lock.txt first. See README.');process.exit(1);}
const vite=path.join(path.dirname(require.resolve('vite/package.json')),'bin','vite.js');
const children=[];let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children){if(child.exitCode===null)child.kill('SIGTERM');}process.exitCode=code;}
function launch(command,args,options){const child=spawn(command,args,{stdio:'inherit',windowsHide:true,...options});children.push(child);child.on('error',e=>{console.error(e.message);stop(1);});child.on('exit',code=>{if(!stopping){console.error(`Development service exited (${code}); stopping the other service.`);stop(code||0);}});return child;}
launch(python,['-m','uvicorn','app.main:app','--app-dir','backend','--host','127.0.0.1','--port','8000','--no-access-log'],{cwd:root,env:{...process.env,ALLOWED_ORIGINS:'http://127.0.0.1:5173,http://localhost:5173'}});
launch(process.execPath,[vite,'--host','127.0.0.1','--port','5173','--strictPort'],{cwd:path.join(root,'frontend'),env:{...process.env,VITE_API_BASE_URL:'http://127.0.0.1:8000'}});
console.log('Integrated demo: http://127.0.0.1:5173 | API: http://127.0.0.1:8000/docs | Ctrl+C stops both.');
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
