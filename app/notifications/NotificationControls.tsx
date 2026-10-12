"use client";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";

type Notice={key:string;title:string;detail:string;href:string;category:string;createdAt:string;urgent:boolean;read:boolean};

export default function NotificationControls({notices:initial}:{notices:Notice[]}){
  const router=useRouter();
  const [notices,setNotices]=useState(initial);
  const [filter,setFilter]=useState("ALL");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const unread=notices.filter(item=>!item.read).length;
  const visible=notices.filter(item=>filter==="ALL"||filter==="UNREAD"&&!item.read||item.category===filter);

  async function mark(keys:string[]){
    if(!keys.length)return;
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/notifications/read",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({keys})
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Could not update notifications.");
      setNotices(items=>items.map(item=>keys.includes(item.key)?{...item,read:true}:item));
      router.refresh();
    }catch(error){setError(error instanceof Error?error.message:"Request failed");}
    finally{setBusy(false);}
  }

  return <section className="panel notificationcenter">
    <div className="notificationtoolbar">
      <div className="notificationfilters">
        {["ALL","UNREAD","REPORT","LEAVE","DOCUMENT","TRAINING","ANNOUNCEMENT"].map(value=>
          <button key={value} type="button" onClick={()=>setFilter(value)} className={filter===value?"active":""}>{value}</button>
        )}
      </div>
      <button type="button" className="outline" disabled={busy||!unread} onClick={()=>mark(notices.filter(item=>!item.read).map(item=>item.key))}>
        {busy?"Saving...":"Mark all read"}
      </button>
    </div>
    {error&&<p className="formerror" role="alert">{error}</p>}
    {visible.length?visible.map(item=><div key={item.key} className={"notificationitem "+(!item.read?"unread ":"")+(item.urgent?"urgent":"")}>
      <div className="notificationbody">
        <div className="notificationmeta"><span>{item.category}</span><time>{new Date(item.createdAt).toLocaleString()}</time>{item.urgent&&<strong>PRIORITY</strong>}</div>
        <Link href={item.href}><b>{item.title}</b></Link>
        <p>{item.detail}</p>
      </div>
      {!item.read&&<button type="button" disabled={busy} onClick={()=>mark([item.key])}>Mark read</button>}
    </div>):<div className="empty">No notifications match this filter.</div>}
  </section>;
}
