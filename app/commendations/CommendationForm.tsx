"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function CommendationForm({officers}:{officers:any[]}){
  const r=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setError("");
    const form=e.currentTarget;
    try{
      const res=await fetch("/api/commendations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))});
      const body=await res.json();
      if(!res.ok) throw new Error(body.error||"Could not issue recognition.");
      form.reset(); r.refresh();
    }catch(err:any){setError(err.message)}finally{setBusy(false)}
  }
  return <form className="panel intelligenceform" onSubmit={submit}>
    <h3>Issue Recognition</h3>
    <label>Officer<select name="officerId" required><option value="">Select officer</option>{officers.map(o=><option key={o.id} value={o.id}>{o.user.name||"Officer"} · #{o.badgeNumber}</option>)}</select></label>
    <label>Type<select name="type"><option>COMMENDATION</option><option>AWARD</option><option>RIBBON</option><option>RECOGNITION</option></select></label>
    <label>Title<input name="title" required/></label>
    <label>Reason<textarea name="reason" rows={4} required/></label>
    <button className="primary full" disabled={busy}>{busy?"Issuing...":"Issue Recognition"}</button>
    {error&&<p className="formerror">{error}</p>}
  </form>;
}