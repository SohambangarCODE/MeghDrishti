import { defineConfig,loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from './tailwind-plugin.js';
export default defineConfig(({mode})=>{
  if(process.env.VERCEL==='1'){
    const base=loadEnv(mode,process.cwd(),'VITE_').VITE_API_BASE_URL;
    if(base){
      let url;
      try{url=new URL(base);}catch{throw new Error('VITE_API_BASE_URL must be a public HTTPS backend URL.');}
      if(url.protocol!=='https:'||['localhost','127.0.0.1','[::1]','0.0.0.0'].includes(url.hostname)||url.hostname.endsWith('.localhost'))throw new Error('Vercel cannot use a local backend. Set a public HTTPS VITE_API_BASE_URL or omit it for a labeled frontend-only preview.');
    }
  }
  return {
  plugins:[react(),tailwind()],
  server:{host:'127.0.0.1',port:5173,strictPort:true},
  build: {sourcemap:true},
  test: { include: ['src/tests/**/*.test.js'] },
  };
});
