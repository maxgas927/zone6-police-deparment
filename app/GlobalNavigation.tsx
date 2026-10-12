"use client";
import {useEffect,useRef,useState} from "react";
import {usePathname} from "next/navigation";
import Link from "next/link";
import {Menu,X} from "lucide-react";
import {can,type Permission} from "@/lib/permissions";
import MobileNav from "./MobileNav";

const links:[string,string,Permission|null][]=[
 ["Command Center","/",null],["My Z6PD","/me","personnel.read"],["Notifications","/notifications","personnel.read"],
 ["Activity Timeline","/operations","personnel.read"],["Personnel","/personnel","personnel.read"],["Organization","/organization","personnel.read"],
 ["Documents","/documents","documents.read"],["Commendations","/commendations","awards.read"],["Global Search","/search","personnel.read"],
 ["Intelligence","/intelligence","intelligence.read"],["Records","/records","records.create"],["Evidence","/evidence","evidence.read"],
 ["Schedule","/schedule","schedule.read"],["Reports","/reports","reports.create"],["Patrol","/patrol","patrol.use"],
 ["Training","/training","personnel.read"],["Fleet","/fleet","admin.manage"],["Armory","/armory","admin.manage"],
 ["Leave Requests","/loa","personnel.read"],["Discipline","/discipline","discipline.read"],["Announcements","/announcements","personnel.read"],
 ["Supervisor Center","/supervisor","reports.review"],["Discord","/discord","discord.manage"],["Administration","/admin","admin.manage"]
];
export default function GlobalNavigation(){
 const pathname=usePathname();
 const [roles,setRoles]=useState<string[]>([]);
 const [open,setOpen]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null);
 const hidden=pathname==="/login"||pathname==="/apply"||pathname.startsWith("/setup");
 useEffect(()=>{setOpen(false)},[pathname]);
 useEffect(()=>{
  if(hidden)return;
  const controller=new AbortController();
  fetch("/api/discord/sync/me",{cache:"no-store",signal:controller.signal})
   .then(r=>r.ok?r.json():null)
   .then(data=>{if(!controller.signal.aborted)setRoles(data?.member&&Array.isArray(data.appRoles)?data.appRoles:[])})
   .catch(()=>{if(!controller.signal.aborted)setRoles([])});
  return ()=>controller.abort();
 },[pathname,hidden]);
 useEffect(()=>{
  if(!open)return;
  const escape=(e:KeyboardEvent)=>{if(e.key==="Escape"){setOpen(false);trigger.current?.focus()}};
  window.addEventListener("keydown",escape);
  return ()=>window.removeEventListener("keydown",escape);
 },[open]);
 if(hidden)return null;
 const visible=links.filter(([, ,permission])=>!permission||roles.some(role=>can(role,permission)));
 return <>
  {roles.length>0&&<>
   <button ref={trigger} className="z6-global-nav-trigger" type="button" aria-controls="z6-global-nav" aria-expanded={open} onClick={()=>setOpen(true)}><Menu size={18}/> All Sections</button>
   {open&&<button type="button" className="z6-global-nav-backdrop" aria-label="Close department menu" onClick={()=>setOpen(false)}/>}
   <aside id="z6-global-nav" aria-label="All department sections" className={"z6-global-nav-drawer"+(open?" open":"")} aria-hidden={!open}>
    <div className="z6-global-nav-head"><b>ZONE6 · NAVIGATION</b><button type="button" aria-label="Close department menu" onClick={()=>setOpen(false)}><X size={20}/></button></div>
    <nav>{visible.map(([label,href])=><Link key={href} href={href} aria-current={pathname===href?"page":undefined} onClick={()=>setOpen(false)} tabIndex={open?0:-1}>{label}</Link>)}</nav>
   </aside>
  </>}
  {roles.length>0&&<MobileNav/>}
 </>;
}
