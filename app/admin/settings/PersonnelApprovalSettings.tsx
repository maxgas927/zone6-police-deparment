"use client";
import {useState} from "react";
export default function PersonnelApprovalSettings({initial}:{initial:boolean}){
 const [enabled,setEnabled]=useState(initial);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 async function save(value:boolean){
  setBusy(true);setMessage("");
  try{
   const r=await fetch("/api/admin/personnel-policy",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({allowCommandSelfReview:value})});
   const b=await r.json();
   if(!r.ok)throw new Error(b.error||"Save failed");
   setEnabled(b.allowCommandSelfReview);setMessage("Personnel approval policy saved.");
  }catch(e){setMessage(e instanceof Error?e.message:"Save failed")}finally{setBusy(false)}
 }
 return <section className="panel setting"><div className="paneltitle"><div><b>Personnel Approval Policy</b><span>Command-only · changes are audited</span></div></div><label className="mappingrow"><span><b>Allow Command members to review their own requests</b><small>When enabled, a Command member may approve or deny a personnel change they submitted. Discord rank changes still use the connected bot.</small></span><input type="checkbox" checked={enabled} disabled={busy} onChange={e=>save(e.target.checked)}/></label><p role="status" className="hint">{message||"Default: disabled. Changes apply immediately to subsequent reviews."}</p></section>;
}
