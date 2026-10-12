"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function VacancyForm(){
  const r=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true); setError("");
    const form=e.currentTarget;
    try{
      const res=await fetch("/api/organization/vacancies",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(form).entries()))});
      const body=await res.json();
      if(!res.ok) throw new Error(body.error||"Could not post vacancy.");
      form.reset(); r.refresh();
    }catch(err:any){setError(err.message)}finally{setBusy(false)}
  }
  return <form className="panel intelligenceform" onSubmit={submit}>
    <h3>Add Open Position</h3>
    <label>Position<input name="title" required/></label>
    <label>Rank<input name="rank"/></label>
    <label>Division<input name="division"/></label>
    <label>Subdivision<input name="subdivision"/></label>
    <button className="primary full" disabled={busy}>{busy?"Posting...":"Post Vacancy"}</button>
    {error&&<p className="formerror">{error}</p>}
  </form>;
}