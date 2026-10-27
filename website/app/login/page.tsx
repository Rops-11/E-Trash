'use client';
import { useState } from 'react';
export default function Login(){
 const [password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});if(!r.ok){const body=await r.json();throw Error(body.error||'Sign-in failed.');}window.location.assign('/');}catch(e){setError(e instanceof Error?e.message:'Could not sign in.');}finally{setBusy(false);}}
 return <main style={{maxWidth:520,paddingTop:'12vh'}}><div className="brand"><span className="brand-icon">↻</span>E-Trash</div><section className="controls" style={{marginTop:32}}><h1 style={{fontSize:36,letterSpacing:-1}}>Your bin, in view.</h1><p>Sign in to view readings and change your device settings.</p><form onSubmit={submit}><label className="control-field">Dashboard password<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><p role="alert" className="form-error">{error}</p><button disabled={busy} type="submit">{busy?'Signing in…':'Sign in'}</button></form><p style={{fontSize:11}}>First run? Complete the setup steps in START-HERE.md.</p></section></main>;
}
