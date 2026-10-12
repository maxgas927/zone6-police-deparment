"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import {Menu,PanelLeftClose,PanelLeftOpen,X} from "lucide-react";

export default function SidebarNav({children}:{children:React.ReactNode}){
  const [open,setOpen]=useState(false);
  const [collapsed,setCollapsed]=useState(false);
  const pathname=usePathname();
  useEffect(()=>{setOpen(false)},[pathname]);
  useEffect(()=>{try{setCollapsed(localStorage.getItem("z6-sidebar-collapsed")==="true")}catch{}},[]);
  useEffect(()=>{try{localStorage.setItem("z6-sidebar-collapsed",String(collapsed))}catch{}},[collapsed]);
  useEffect(()=>{if(!open)return;const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")setOpen(false)};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[open]);
  useEffect(()=>{
    const close=()=>setOpen(false);
    window.addEventListener("popstate",close);
    return ()=>window.removeEventListener("popstate",close);
  },[]);
  return <>
    <button className="sidebar-mobile-trigger" aria-label="Open department navigation" aria-expanded={open} onClick={()=>setOpen(true)}><Menu size={21}/><span>Menu</span></button>
    {open&&<button className="sidebar-backdrop" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
    <aside aria-label="Department navigation" className={"z6-sidebar"+(open?" sidebar-open":"")+(collapsed?" sidebar-collapsed":"")}>
      <div className="sidebar-controls">
        <span>DEPARTMENT NAVIGATION</span>
        <button className="sidebar-collapse" title={collapsed?"Expand sidebar":"Collapse sidebar"} aria-label={collapsed?"Expand sidebar":"Collapse sidebar"} onClick={()=>setCollapsed(v=>!v)}>{collapsed?<PanelLeftOpen size={17}/>:<PanelLeftClose size={17}/>}</button>
        <button className="sidebar-close" aria-label="Close navigation" onClick={()=>setOpen(false)}><X size={19}/></button>
      </div>
      <div className="sidebar-scroll" onClick={e=>{if((e.target as HTMLElement).closest("a"))setOpen(false)}}>{children}</div>
    </aside>
  </>;
}
