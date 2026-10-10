import {useEffect,useRef,useState} from 'react';
import {useAuth} from '../state/AuthState.jsx';
import {Notice} from '../components.jsx';

export default function AiAssessment({run,generate}){
 const auth=useAuth(),context=`${auth.generation}:${auth.session?.user.id||''}:${run.id}`;
 const current=useRef(context);current.current=context;
 const [state,setState]=useState({context,result:null,error:'',pending:false});
 useEffect(()=>{setState({context,result:null,error:'',pending:false});},[context]);
 const visible=state.context===context?state:{result:null,error:'',pending:false};
 const load=async()=>{
  const expected=context;setState({context,result:null,error:'',pending:true});
  try{const result=await generate(run);if(current.current===expected)setState({context,result,error:'',pending:false});}
  catch(e){if(current.current===expected)setState({context,result:null,error:e.message,pending:false});}
 };
 useEffect(()=>()=>{current.current=null;},[]);
 return <section aria-label="AI climate risk assessment"><h2>AI climate risk assessment</h2>
 <p>Gemini prioritizes supplied modeled facts for review. This sends the selected analysis holdings and modeled results to Google only when requested. It does not change the saved report or retrieve current weather.</p>
 <button className="secondary" disabled={visible.pending} onClick={load}>{visible.pending?'Generating AI assessment...':'Generate AI Assessment'}</button>
 {visible.error&&<Notice error>{visible.error} Original results remain available.</Notice>}
 {visible.result?.status==='unavailable'&&<Notice error>{visible.result.error?.message||'AI assessment unavailable.'}</Notice>}
 {visible.result?.status==='available'&&<div role="region" aria-label="Generated AI assessment"><Notice>{visible.result.disclosure}</Notice><p>Model: {visible.result.model}</p>{visible.result.sections.map(s=><article key={s.id}><h3>{s.title}</h3><ul>{s.statements.map(p=><li key={p.factId}>{p.text}</li>)}</ul></article>)}</div>}
 </section>;
}
