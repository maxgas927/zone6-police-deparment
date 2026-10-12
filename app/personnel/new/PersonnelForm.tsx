"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function PersonnelForm({
  users,
  divisions
}:{users:{id:string;name:string|null;image:string|null}[];divisions:{id:string;name:string}[]}){
  const router=useRouter();
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);

  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    setBusy(true);
    setMsg("");

    const body=Object.fromEntries(new FormData(e.currentTarget).entries());

    try{
      const response=await fetch("/api/personnel",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body)
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Could not create officer");
      router.push("/personnel/"+result.id);
      router.refresh();
    }catch(error:any){
      setMsg(error.message);
    }finally{
      setBusy(false);
    }
  }

  return <form className="personnelform panel" onSubmit={submit}>
    <label>
      Discord User
      <select name="userId" required defaultValue="">
        <option value="" disabled>Select linked user</option>
        {users.map(item=>
          <option key={item.id} value={item.id}>
            {item.name||"Discord User"}{item.image?" · Discord profile linked":""}
          </option>
        )}
      </select>
    </label>

    <label>
      Badge Number
      <input value="Random 5-digit badge generated automatically" disabled/>
      <small>A unique badge number from 10000–99999 is assigned when the personnel record is created.</small>
    </label>

    <label>
      Discord Nickname Format
      <input value="1A-03 | Dept. Chief | Davion" disabled/>
      <small>1A-03 becomes the callsign. Davion becomes the officer name. The middle title is informational.</small>
    </label>

    <label>
      Rank
      <input value="Assigned automatically from Discord roles" disabled/>
      <small>The highest-priority mapped department rank wins.</small>
    </label>

    <label>
      Division
      <select name="divisionId">
        <option value="">No Division</option>
        {divisions.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>

    <div className="formactions">
      <button className="primary" disabled={busy}>
        {busy?"Creating...":"Create Personnel Record"}
      </button>
    </div>

    {msg&&<p className="formerror">{msg}</p>}
  </form>;
}
