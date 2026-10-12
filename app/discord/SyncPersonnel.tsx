"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function SyncPersonnel(){
  const router=useRouter();
  const [msg,setMsg]=useState("");

  async function go(){
    setMsg("Syncing...");
    const r=await fetch("/api/discord/sync",{method:"POST"});
    const b=await r.json();
    setMsg(r.ok?"Synced "+b.synced+" personnel · "+b.changed+" rank changes · "+b.missing+" not in server · "+b.failed+" failed":b.error||"Sync failed");
    if(r.ok)router.refresh();
  }

  return <div className="syncbox">
    <button className="primary" onClick={go}>Run Full Discord Sync Now</button>
    <span>Full department sync runs every 1 minute. Active signed-in users also refresh every 30 seconds.</span>
    {msg&&<span>{msg}</span>}
  </div>;
}
