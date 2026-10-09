import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { AppState } from './state/AppState.jsx';
import App from './App.jsx';
import 'virtual:meghdrishti-tailwind.css';
import './styles.css';
class Boundary extends React.Component {
  state={error:null};static getDerivedStateFromError(error){return {error};}
  render(){return this.state.error?<main><h1>Workspace could not render</h1><p role="alert">{this.state.error.message}</p><button onClick={()=>location.reload()}>Reload workspace</button></main>:this.props.children;}
}
const queryClient=new QueryClient({defaultOptions:{queries:{retry:1,staleTime:60000,refetchOnWindowFocus:false}}});
createRoot(document.getElementById('root')).render(<React.StrictMode><Boundary><QueryClientProvider client={queryClient}><BrowserRouter><AppState><App/></AppState></BrowserRouter></QueryClientProvider></Boundary></React.StrictMode>);
