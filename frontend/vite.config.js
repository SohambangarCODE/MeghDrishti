import { defineConfig,loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from './tailwind-plugin.js';
export default defineConfig(({mode})=>{
  const deploymentDefines={};
  if(process.env.VERCEL==='1'){
    const base=loadEnv(mode,process.cwd(),'VITE_').VITE_API_BASE_URL;
    if(base){
      let valid=false;
      try{
        const url=new URL(base);
        valid=url.protocol==='https:'&&!url.username&&!url.password&&!['localhost','127.0.0.1','[::1]','0.0.0.0'].includes(url.hostname)&&!url.hostname.endsWith('.localhost');
      }catch{/* An invalid deployment URL must not become a browser API target. */}
      if(!valid){
        deploymentDefines['import.meta.env.VITE_API_BASE_URL']=JSON.stringify('');
        console.warn('VITE_API_BASE_URL is not a public HTTPS backend URL. Building the explicitly labeled frontend-only preview; backend features remain unavailable until configured.');
      }
    }
  }
  return {
  define:deploymentDefines,
  plugins:[react(),tailwind()],
  server:{host:'127.0.0.1',port:5173,strictPort:true},
  build: {sourcemap:true},
  test: { include: ['src/tests/**/*.test.js'] },
  };
});
