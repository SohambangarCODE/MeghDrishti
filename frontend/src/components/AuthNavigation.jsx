import { Navigate,Link,useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthState.jsx';
import { safeDestination } from '../state/authDestination.js';
import { Notice } from '../components.jsx';
export function PrivateRoute({children}){const auth=useAuth(),location=useLocation();if(!auth.ready)return <Notice>Restoring session...</Notice>;return auth.session?<div key={auth.generation}>{children}</div>:<Navigate replace to={'/auth?next='+encodeURIComponent(safeDestination(location.pathname+location.search))}/>;}
export function AccountControl(){const auth=useAuth();return <div className="actions">{!auth.ready?<span>Restoring session...</span>:auth.session?<><span>Signed in as {auth.session.user.email}</span><Link to="/cloud">Open private cloud workspace</Link><button disabled={auth.signingOut} onClick={auth.signOut}>Sign out</button></>:<Link className="button secondary" to="/auth">Sign in</Link>}{auth.authError&&<Notice error>{auth.authError}<button disabled={auth.signingOut} onClick={auth.signOut}>Retry session cleanup</button></Notice>}</div>;}
