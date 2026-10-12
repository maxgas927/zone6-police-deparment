"use client";
import {useEffect,useRef} from "react";
import {usePathname,useRouter} from "next/navigation";

export default function AutoDiscordSync(){
  const router=useRouter();
  const pathname=usePathname();
  const lastSignature=useRef<string|null>(null);
  const firstSync=useRef(true);

  useEffect(()=>{
    if(pathname==="/login"||pathname==="/apply"||pathname.startsWith("/setup"))return;

    let active=true;
    let busy=false;

    async function sync(){
      if(!active||busy||document.visibilityState==="hidden")return;
      busy=true;
      try{
        const response=await fetch("/api/discord/sync/me",{cache:"no-store"});
        if(response.status===401)return;
        const data=await response.json();
        if(!response.ok)return;

        const signature=JSON.stringify({member:data.member,appRoles:data.appRoles,accessError:data.accessError});
        const accessChanged=lastSignature.current!==null&&lastSignature.current!==signature;
        lastSignature.current=signature;

        if(firstSync.current||accessChanged||data.rankChanged){
          firstSync.current=false;
          router.refresh();
        }
      }catch(error){
        console.error("AUTO_DISCORD_SYNC_FAILED",error);
      }finally{
        busy=false;
      }
    }

    sync();
    const timer=window.setInterval(sync,30000);
    const onVisibility=()=>{if(document.visibilityState==="visible")sync()};
    document.addEventListener("visibilitychange",onVisibility);

    return ()=>{
      active=false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange",onVisibility);
    };
  },[pathname,router]);

  return null;
}
