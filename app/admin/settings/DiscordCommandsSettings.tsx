"use client";
import { useState } from "react";
export default function DiscordCommandsSettings(){
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 async function register(){
  if(!window.confirm("Register /promote, /demote and /rankstatus in the department Discord server?"))return;
  setBusy(true);setMessage("");
  try{
   const response=await fetch("/api/admin/discord-commands",{method:"POST"});
   const result=await response.json();
   setMessage(response.ok?"Successfully registered "+result.count+" commands. Open Discord and type / to find them.":result.error||"Command registration failed");
  }catch{setMessage("Network error registering commands")}finally{setBusy(false)}
 }
 return <section className="panel">
  <div className="paneltitle"><div><b>Discord Slash Commands</b><span>Manage bot commands without a terminal</span></div></div>
  <p className="hint">Register /promote, /demote and /rankstatus with the connected Discord application. Promotion and demotion requests still require Command approval on the website.</p>
  <button type="button" className="primary" disabled={busy} onClick={register}>{busy?"Registering...":"Register Discord Commands"}</button>
  {message&&<p role="status" className="hint">{message}</p>}
 </section>;
}
