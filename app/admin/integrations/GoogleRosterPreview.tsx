"use client";
import { useEffect, useState } from "react";
type Officer = { sourceRow:number; rank:string; name:string; callsign:string; discordName:string; activity:string };
type Result = { configured?:boolean; message?:string; error?:string; rows?:Officer[] };
export default function GoogleRosterPreview() {
  const [result,setResult]=useState<Result|null>(null);
  const [loading,setLoading]=useState(false);
  const load=async()=>{setLoading(true);try{const response=await fetch("/api/admin/google-roster",{cache:"no-store"});setResult(await response.json());}catch{setResult({error:"Unable to load roster preview."});}finally{setLoading(false);}};
  useEffect(()=>{void load();},[]);
  return <section className="panel"><h3>Google Sheets · Personnel Roster</h3>
    <p className="hint">Source: Z6RP PD Roster / Main Roster. Read-only preview: no officers, ranks, Discord roles or spreadsheet cells will be changed.</p>
    <p><a href="https://docs.google.com/spreadsheets/d/1FtwxaIYmi3yjRba_9zpQPzLvjN2tZdGfIdYvT_yJ-Pk/edit" target="_blank" rel="noopener noreferrer">Open source spreadsheet ↗</a></p>
    <button type="button" className="primary" onClick={()=>void load()} disabled={loading}>{loading?"Checking…":"Refresh preview"}</button>
    {result?.message&&<p className="hint">{result.message}</p>}
    {result?.error&&<p role="alert">{result.error}</p>}
    {result?.rows&&<><p className="hint">{result.rows.length} candidate roster entries shown. Import is intentionally disabled until identity matching is validated.</p>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left"}}><thead><tr><th>Rank</th><th>Name</th><th>Callsign</th><th>Discord</th><th>Activity</th></tr></thead>
      <tbody>{result.rows.slice(0,60).map(row=><tr key={row.sourceRow}><td>{row.rank}</td><td>{row.name}</td><td>{row.callsign}</td><td>{row.discordName}</td><td>{row.activity}</td></tr>)}</tbody></table></div></>}
  </section>;
}
