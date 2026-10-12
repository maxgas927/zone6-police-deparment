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
 const [filter,setFilter]=useState("ACTION");
 const [search,setSearch]=useState("");
 const [confirm,setConfirm]=useState<{id:string;status:"APPROVED"|"DENIED"}|null>(null);
 async function create(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage("");
  try{const b=Object.fromEntries(new FormData(e.currentTarget).entries());const r=await fetch("/api/personnel/changes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});const data=await r.json();setMessage(r.ok?"Request submitted for command approval.":data.error||"Could not create request");if(r.ok)router.refresh()}catch{setMessage("Network error submitting request")}finally{setBusy(false)}
 }
 async function review(id:string,status:"APPROVED"|"DENIED"){
  setBusy(true);setMessage("");
  try{const r=await fetch("/api/personnel/changes/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,reviewNote:notes[id]||""})});const data=await r.json();setMessage(r.ok?"Request "+status.toLowerCase():data.error||"Review failed");if(r.ok)router.refresh()}catch{setMessage("Network error reviewing request")}finally{setBusy(false)}
 }
 const targets=kind==="TRANSFER"?divisions:ranks;
 const actionable=requests.filter(r=>r.status==="PENDING"||r.status==="SYNC_FAILED").length;
 const visible=requests.filter(r=>{
  if(filter==="ACTION"&&r.status!=="PENDING"&&r.status!=="SYNC_FAILED")return false;
  if(filter!=="ALL"&&filter!=="ACTION"&&r.status!==filter)return false;
  const officer=officers.find(o=>o.id===r.officerId);
  const target=(r.kind==="TRANSFER"?divisions:ranks).find(x=>x.id===r.targetId);
  return [officer?.user.name,officer?.badgeNumber,r.kind,r.reason,target?.name].some(x=>x?.toLowerCase().includes(search.toLowerCase()));
 });
 return <div className="twocol">
 <section className="panel setting"><div className="paneltitle"><div><b>Request Personnel Change</b><span>Command review · policy-controlled self-approval</span></div></div>
 <form className="reportform" onSubmit={create}>
 <label>Officer<select name="officerId" required>{officers.map(o=><option key={o.id} value={o.id}>{o.user.name||"Officer"} · #{o.badgeNumber}</option>)}</select></label>
 <label>Action<select name="kind" value={kind} onChange={e=>setKind(e.target.value)}><option value="PROMOTION">Promotion</option><option value="DEMOTION">Demotion</option><option value="TRANSFER">Division Transfer</option></select></label>
 <label>Requested {kind==="TRANSFER"?"Division":"Rank"}<select name="targetId" key={kind} required>{targets.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
 <label className="full">Reason<textarea name="reason" required minLength={5} maxLength={4000} rows={4}/></label>
 <button className="primary" disabled={busy||!officers.length||!targets.length}>Submit for Approval</button>
 </form></section>
 <section className="panel setting"><div className="paneltitle"><div><b>Command Approval Queue</b><span>Pending changes and recent decisions</span></div></div>
 <p className="hint">Command members review each request. Self-review is {allowSelfReview?"enabled":"disabled"}. Approved rank changes update Discord through the department bot.</p>
 <div className="reportactions"><label>Show<select aria-label="Filter approval requests" value={filter} onChange={e=>setFilter(e.target.value)}><option value="ACTION">Needs action ({actionable})</option><option value="ALL">All requests</option><option value="APPROVED">Approved</option><option value="DENIED">Denied</option><option value="SYNC_FAILED">Sync failed</option></select></label><label>Search<input aria-label="Search approval requests" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Officer, badge, rank or reason"/></label></div>
 {visible.map(item=><div className="mappingrow" key={item.id}><div><b>{item.kind} · {officers.find(o=>o.id===item.officerId)?.user.name||item.officerId}</b><small>{item.status} · {item.reason} · Target: {(item.kind==="TRANSFER"?divisions:ranks).find(x=>x.id===item.targetId)?.name||"Unknown"}</small><small>{new Date(item.createdAt).toLocaleString()}</small>
 {item.reviewNote&&<small>Review: {item.reviewNote}</small>}
 {(item.status==="PENDING"||item.status==="SYNC_FAILED")&&(allowSelfReview||item.requestedBy!==userId)&&<div><textarea aria-label="Command review note" placeholder="Review note (required for denial)" value={notes[item.id]||""} onChange={e=>setNotes(v=>({...v,[item.id]:e.target.value}))} rows={2}/><div className="reportactions"><button className="primary" disabled={busy} onClick={()=>setConfirm({id:item.id,status:"APPROVED"})}>{item.status==="SYNC_FAILED"?"Retry Discord & Approve":"Approve & Sync Discord"}</button><button className="secondary danger" disabled={busy||!(notes[item.id]||"").trim()} onClick={()=>setConfirm({id:item.id,status:"DENIED"})}>Deny</button></div></div>}
 </div></div>)}
 {!visible.length&&<p className="hint">No requests match this view.</p>}
 {confirm&&<div className="panel" role="alertdialog" aria-modal="true" aria-label="Confirm personnel decision"><b>Confirm {confirm.status==="APPROVED"?"approval":"denial"}</b><p className="hint">{confirm.status==="APPROVED"?"This will apply the requested personnel change and synchronize mapped Discord rank roles for promotions and demotions.":"This will deny the request and record the review reason."}</p><div className="reportactions"><button className="primary" disabled={busy} onClick={async()=>{const decision=confirm;setConfirm(null);await review(decision.id,decision.status)}}>Confirm {confirm.status==="APPROVED"?"approval":"denial"}</button><button className="secondary" onClick={()=>setConfirm(null)}>Cancel</button></div></div>}
 </section>{message&&<p role="status" className="hint">{message}</p>}</div>;
}
