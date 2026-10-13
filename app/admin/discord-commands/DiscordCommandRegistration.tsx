"use client";
import {useEffect,useState} from "react";
export default function DiscordCommandRegistration(){
 const [commands,setCommands]=useState<string[]>([]);
 const [configured,setConfigured]=useState<boolean|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [confirm,setConfirm]=useState(false);
 useEffect(()=>{const controller=new AbortController();fetch("/api/admin/discord-commands",{cache:"no-store",signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error||"Could not load commands");if(!controller.signal.aborted){setCommands(data.commands||[]);setConfigured(!!data.configured)}}).catch(error=>{if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:"Could not load commands")});return ()=>controller.abort()},[]);
 async function register(){
  setBusy(true);setMessage("");
  try{
   const response=await fetch("/api/admin/discord-commands",{method:"POST"});
   const data=await response.json();
   setMessage(response.ok?"Successfully registered "+data.count+" Discord commands.":data.error||"Registration failed");
  }catch{setMessage("Network error registering commands")}finally{setBusy(false);setConfirm(false)}
 }
 return <section className="panel"><div className="paneltitle"><div><b>Command Registration</b><span>{commands.length} defined guild commands</span></div><span className={configured?"connpill online":"connpill"}>{configured===null?"Checking":configured?"Configured":"Needs configuration"}</span></div>
 {message&&<p role="status" className="hint">{message}</p>}
 <div className="v4shortcuts">{commands.map(command=><div key={command} className="panel"><b>/{command}</b></div>)}</div>
 <p className="hint">Registering updates the commands shown in the configured Discord guild. This operation does not itself change officer ranks or personnel records.</p>
 {!confirm?<button className="primary" disabled={busy||!configured||!commands.length} onClick={()=>setConfirm(true)}>Register / Update Discord Commands</button>:<div role="group" aria-label="Confirm Discord command registration"><p>Replace the guild slash command definitions with the {commands.length} commands listed above?</p><div className="reportactions"><button className="primary" disabled={busy} onClick={register}>{busy?"Registering...":"Confirm registration"}</button><button className="secondary" disabled={busy} onClick={()=>setConfirm(false)}>Cancel</button></div></div>}
 </section>;
}
