"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
type Rank={id:string;name:string;priority:number};
export default function DiscordRankImporter(){
 const router=useRouter();
 const [ranks,setRanks]=useState<Rank[]>([]);
 const [selected,setSelected]=useState<string[]>([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 async function preview(){
  setBusy(true);setMessage("");
  try{const r=await fetch("/api/ranks/import-discord",{cache:"no-store"});const data=await r.json();if(!r.ok)throw new Error(data.error||"Discord lookup failed");setRanks(data.ranks);setSelected(data.ranks.map((x:Rank)=>x.id));if(!data.ranks.length)setMessage("No police rank roles matched. Review role names in Discord.")}
  catch(e){setMessage(e instanceof Error?e.message:"Unable to load Discord roles")}finally{setBusy(false)}
 }
 async function apply(){
  if(!selected.length)return;
  setBusy(true);setMessage("");
  try{const r=await fetch("/api/ranks/import-discord",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({roleIds:selected})});const data=await r.json();if(!r.ok)throw new Error(data.error||"Import failed");setMessage("Saved "+data.created+" new ranks and updated "+data.updated+". Highest: "+data.highest+"; lowest: "+data.lowest+".");router.refresh()}
  catch(e){setMessage(e instanceof Error?e.message:"Import failed")}finally{setBusy(false)}
 }
 return <section className="panel setting"><div className="paneltitle"><div><b>Import Police Ranks from Discord</b><span>V9.9.1 · Highest server role first, lowest last</span></div></div>
 <p className="hint">Fetch the real Discord role names and positions, review the detected police ranks, and import only the selected roles. Existing officer assignments and unrelated roles are preserved.</p>
 <button className="secondary" type="button" disabled={busy} onClick={preview}>{busy?"Working...":"Pull Rank Names from Discord"}</button>
 {ranks.map((r,i)=><label key={r.id} className="mappingrow"><span><b>{i+1}. {r.name}</b><small>Rank priority {r.priority}</small></span><input type="checkbox" checked={selected.includes(r.id)} onChange={e=>setSelected(s=>e.target.checked?[...s,r.id]:s.filter(id=>id!==r.id))}/></label>)}
 {ranks.length>0&&<button className="primary" type="button" disabled={busy||!selected.length} onClick={apply}>Save Selected Rank Hierarchy</button>}
 {message&&<p className="hint" role="status">{message}</p>}
 </section>;
}
