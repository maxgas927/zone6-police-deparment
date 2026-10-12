"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";

function formatCountdown(seconds:number){
  const safe=Math.max(0,seconds);
  return "00:"+String(safe).padStart(2,"0");
}

export default function SyncPersonnel(){
  const router=useRouter();
  const [msg,setMsg]=useState("");
  const [seconds,setSeconds]=useState(60);

  useEffect(()=>{
    let active=true;

    async function loadTimer(){
      try{
        const response=await fetch("/api/discord/sync/status",{cache:"no-store"});
        if(!response.ok)return;
        const data=await response.json();
        if(!active)return;
        if(data.nextRunAt){
          setSeconds(Math.max(0,Math.ceil((data.nextRunAt-Date.now())/1000)));
        }
      }catch{}
    }

    loadTimer();
    const refreshTimer=window.setInterval(loadTimer,15000);
    const countdownTimer=window.setInterval(()=>{
      setSeconds(current=>current<=1?60:current-1);
    },1000);

    return ()=>{
      active=false;
      window.clearInterval(refreshTimer);
      window.clearInterval(countdownTimer);
    };
  },[]);

  async function go(){
    setMsg("Syncing...");
    const r=await fetch("/api/discord/sync",{method:"POST"});
    const b=await r.json();
    setMsg(r.ok?"Synced "+b.synced+" personnel · "+b.changed+" rank changes · "+b.missing+" not in server · "+b.failed+" failed":b.error||"Sync failed");
    if(r.ok)router.refresh();
  }

  return <div className="syncbox">
    <button className="primary" onClick={go}>Run Full Discord Sync Now</button>
    <span><b>Next full department sync in {formatCountdown(seconds)}</b></span>
    <span>Full department sync runs every 1 minute. Active signed-in users also refresh every 30 seconds.</span>
    {msg&&<span>{msg}</span>}
  </div>;
}
