"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function DocumentForm(){
  const r=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setError("");
    const form=e.currentTarget;
    try{
      const data=Object.fromEntries(new FormData(form).entries());
      const res=await fetch("/api/documents",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      const body=await res.json();
      if(!res.ok) throw new Error(body.error||"Could not publish document.");
      form.reset(); r.refresh();
    }catch(err:any){setError(err.message)}finally{setBusy(false)}
  }
  return <form className="panel intelligenceform" onSubmit={submit}>
    <h3>Publish Department Document</h3>
    <label>Title<input name="title" required/></label>
    <label>Category<input name="category" placeholder="SOP, Policy, Training, Form" required/></label>
    <label>Version<input name="version" defaultValue="1.0" required/></label>
    <label>Effective Date<input name="effectiveAt" type="date"/></label>
    <label>Content<textarea name="body" rows={7} required/></label>
    <label><input name="requiredAck" type="checkbox"/> Require acknowledgement</label>
    <button className="primary full" disabled={busy}>{busy?"Publishing...":"Publish Document"}</button>
    {error&&<p className="formerror">{error}</p>}
  </form>;
}