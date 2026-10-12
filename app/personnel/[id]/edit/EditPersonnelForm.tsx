"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function EditPersonnelForm({
  officer,
  divisions,
  subdivisions
}:{officer:any;divisions:any[];subdivisions:any[]}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState("");

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true);
    setMsg("");

    const body=Object.fromEntries(new FormData(e.currentTarget).entries());

    try{
      const response=await fetch("/api/personnel/"+officer.id,{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body)
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Update failed");
      router.push("/personnel/"+officer.id);
      router.refresh();
    }catch(error:any){
      setMsg(error.message);
    }finally{
      setBusy(false);
    }
  }

  return <form className="personnelform panel" onSubmit={submit}>
    <label>
      Badge Number
      <input name="badgeNumber" required defaultValue={officer.badgeNumber}/>
    </label>
    <label>
      Name
      <input value={officer.user?.name||"Unassigned"} disabled/>
      <small>Uses the last section of the Discord server nickname. Example: Davion.</small>
    </label>
    <label>
      Callsign
      <input value={officer.callsign||"Unassigned"} disabled/>
      <small>Uses the first section of the Discord server nickname. Example: 1A-03.</small>
    </label>
    <label>
      Rank
      <input value={officer.rank?.name||"Unassigned"} disabled/>
      <small>Managed automatically from the officer&apos;s mapped Discord role.</small>
    </label>
    <label>
      Division
      <select name="divisionId" defaultValue={officer.divisionId||""}>
        <option value="">No Division</option>
        {divisions.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
    <label>
      Sub-Division
      <select name="subdivisionId" defaultValue={officer.subdivisionId||""}>
        <option value="">No Sub-Division</option>
        {subdivisions.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
    <label>
      Personnel Status
      <select name="status" defaultValue={officer.status}>
        <option value="ACTIVE">Active</option>
        <option value="LOA">LOA</option>
        <option value="SUSPENDED">Suspended</option>
        <option value="TERMINATED">Terminated</option>
      </select>
    </label>
    <label>
      Duty Status
      <select name="dutyStatus" defaultValue={officer.dutyStatus}>
        <option value="OFF_DUTY">Off Duty</option>
        <option value="AVAILABLE">Available</option>
        <option value="ON_DUTY">On Duty</option>
        <option value="BUSY">Busy</option>
      </select>
    </label>
    <div className="formactions">
      <button className="primary" disabled={busy}>
        {busy?"Saving...":"Save Personnel Changes"}
      </button>
    </div>
    {msg&&<p className="formerror">{msg}</p>}
  </form>;
}
