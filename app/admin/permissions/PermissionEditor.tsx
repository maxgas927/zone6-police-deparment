"use client";
import {useState} from "react";
type Props={initial:Record<string,string[]>;roles:string[];permissions:string[]};
export default function PermissionEditor({initial,roles,permissions}:Props){
 const [matrix,setMatrix]=useState(initial);
 const [busy,setBusy]=useState("");
 const [message,setMessage]=useState("");
 async function change(role:string,permission:string,allowed:boolean){
  const key=role+":"+permission;setBusy(key);setMessage("");
  try{
   const r=await fetch("/api/admin/permissions",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({role,permission,allowed})});
   const b=await r.json();
   if(!r.ok)throw new Error(b.error||"Permission update failed");
   setMatrix(b.matrix);setMessage(role+" · "+permission+" saved.");
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to save")}finally{setBusy("")}
 }
 return <><div className="panel v91-permissions-table" style={{overflowX:"auto"}}><table><thead><tr><th>Permission</th>{roles.map(r=><th key={r}>{r}</th>)}</tr></thead><tbody>{permissions.map(p=><tr key={p}><th scope="row">{p}</th>{roles.map(r=><td key={r}><input aria-label={r+" "+p} type="checkbox" checked={matrix[r]?.includes(p)||false} disabled={r==="COMMAND"||!!busy} onChange={e=>change(r,p,e.target.checked)}/></td>)}</tr>)}</tbody></table></div><p role="status" className="hint">{message||"Changes are saved immediately and audited. COMMAND is permanently granted all permissions."}</p></>;
}
