"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
export default function SupervisorNoteForm({officerId}:{officerId:string}){
 const router=useRouter();
 const [body,setBody]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");
  try{
   const response=await fetch("/api/personnel/"+officerId+"/notes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Could not save note.");
   setBody("");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Request failed");}
  finally{setBusy(false);}
 }
 return <form className="personnel-note-form" onSubmit={save}>
  <label htmlFor="supervisor-note">Add confidential note</label>
  <textarea id="supervisor-note" rows={3} maxLength={2000} required value={body} onChange={e=>setBody(e.target.value)} placeholder="Supervisor observation, coaching or follow-up..."/>
  <button className="primary" disabled={busy||!body.trim()}>{busy?"Saving...":"Save Supervisor Note"}</button>
  {error&&<p role="alert" className="formerror">{error}</p>}
 </form>;
}