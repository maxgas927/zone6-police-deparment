"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function PersonnelForm({users,divisions}:{users:{id:string;name:string|null;image:string|null}[];divisions:{id:string;name:string}[]}){
  const router=useRouter();
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setMsg("");
    const body=Object.fromEntries(new FormData(e.currentTarget).entries());
    try{
      const r=await fetch("/api/personnel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const b=await r.json();
      if(!r.ok)throw new Error(b.error||"Could not create officer");
      router.push("/personnel/"+b.id);router.refresh();
    }catch(error:any){setMsg(error.message)}finally{setBusy(false)}
  }

  return <form className="personnelform panel" onSubmit={submit}>
    <label>Discord User<select name="userId" required defaultValue=""><option value="" disabled>Select linked user</option>{users.map(x=><option key={x.id} value={x.id}>{x.name||"Discord User"}{x.image?" · Discord profile linked":""}</option>)}</select></label>
    <label>Badge Number<input name="badgeNumber" required placeholder="106"/></label>
    <label>Callsign<input name="callsign" placeholder="2A-06"/></label>
    <label>Rank<input value="Assigned automatically from Discord" disabled/><small>The highest-priority mapped department rank on this user&apos;s Discord roles will be used.</small></label>
    <label>Division<select name="divisionId"><option value="">No Division</option>{divisions.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <div className="formactions"><button className="primary" disabled={busy}>{busy?"Creating...":"Create Personnel Record"}</button></div>
    {msg&&<p className="formerror">{msg}</p>}
  </form>;
}
