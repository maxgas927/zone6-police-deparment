"use client";
import {useRouter} from "next/navigation";
import {useState} from "react";
type Officer={id:string;badgeNumber:string;user:{name:string|null}};
type Target={id:string;name:string};
type Request={id:string;officerId:string;kind:string;targetId:string;reason:string;status:string;requestedBy:string;reviewNote:string|null;createdAt:Date};
export default function ApprovalConsole({officers,ranks,divisions,requests,userId,allowSelfReview}:{officers:Officer[];ranks:Target[];divisions:Target[];requests:Request[];userId:string;allowSelfReview:boolean}){
 const router=useRouter();
 const [kind,setKind]=useState("PROMOTION");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [notes,setNotes]=useState<Record<string,string>>({});
 async function create(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage("");
  try{const b=Object.fromEntries(new FormData(e.currentTarget).entries());const r=await fetch("/api/personnel/changes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});const data=await r.json();setMessage(r.ok?"Request submitted for command approval.":data.error||"Could not create request");if(r.ok)router.refresh()}catch{setMessage("Network error submitting request")}finally{setBusy(false)}
 }
 async function review(id:string,status:"APPROVED"|"DENIED"){
  setBusy(true);setMessage("");
  try{const r=await fetch("/api/personnel/changes/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,reviewNote:notes[id]||""})});const data=await r.json();setMessage(r.ok?"Request "+status.toLowerCase():data.error||"Review failed");if(r.ok)router.refresh()}catch{setMessage("Network error reviewing request")}finally{setBusy(false)}
 }
 const targets=kind==="TRANSFER"?divisions:ranks;
 return <div className="twocol">
 <section className="panel setting"><div className="paneltitle"><div><b>Request Personnel Change</b><span>Requires separate command approval</span></div></div>
 <form className="reportform" onSubmit={create}>
 <label>Officer<select name="officerId" required>{officers.map(o=><option key={o.id} value={o.id}>{o.user.name||"Officer"} · #{o.badgeNumber}</option>)}</select></label>
 <label>Action<select name="kind" value={kind} onChange={e=>setKind(e.target.value)}><option value="PROMOTION">Promotion</option><option value="DEMOTION">Demotion</option><option value="TRANSFER">Division Transfer</option></select></label>
 <label>Requested {kind==="TRANSFER"?"Division":"Rank"}<select name="targetId" key={kind} required>{targets.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
 <label className="full">Reason<textarea name="reason" required minLength={5} maxLength={4000} rows={4}/></label>
 <button className="primary" disabled={busy||!officers.length||!targets.length}>Submit for Approval</button>
 </form></section>
 <section className="panel setting"><div className="paneltitle"><div><b>Command Approval Queue</b><span>Pending changes and recent decisions</span></div></div>
 <p className="hint">Only another Command member can approve or deny a request. Approving a rank change updates Discord through the department bot.</p>
 {requests.map(item=><div className="mappingrow" key={item.id}><div><b>{item.kind} · {officers.find(o=>o.id===item.officerId)?.user.name||item.officerId}</b><small>{item.status} · {item.reason} · Target: {(item.kind==="TRANSFER"?divisions:ranks).find(x=>x.id===item.targetId)?.name||"Unknown"}</small><small>{new Date(item.createdAt).toLocaleString()}</small>
 {item.reviewNote&&<small>Review: {item.reviewNote}</small>}
 {(item.status==="PENDING"||item.status==="SYNC_FAILED")&&(allowSelfReview||item.requestedBy!==userId)&&<div><textarea aria-label="Command review note" placeholder="Review note (required for denial)" value={notes[item.id]||""} onChange={e=>setNotes(v=>({...v,[item.id]:e.target.value}))} rows={2}/><div className="reportactions"><button className="primary" disabled={busy} onClick={()=>review(item.id,"APPROVED")}>{item.status==="SYNC_FAILED"?"Retry Discord & Approve":"Approve & Sync Discord"}</button><button className="secondary danger" disabled={busy||!(notes[item.id]||"").trim()} onClick={()=>review(item.id,"DENIED")}>Deny</button></div></div>}
 </div></div>)}
 {!requests.length&&<p className="hint">No personnel change requests yet.</p>}
 </section>{message&&<p role="status" className="hint">{message}</p>}</div>;
}
