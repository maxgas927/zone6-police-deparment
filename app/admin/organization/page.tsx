import Link from "next/link";
import {redirect} from "next/navigation";
import {prisma} from "@/lib/prisma";
import {currentAccess} from "@/lib/authz";
import {getGuildRoles} from "@/lib/discord";
import OrganizationManager from "./OrganizationManager";
import OrganizationEditor from "./OrganizationEditor";
export const dynamic="force-dynamic";

export default async function Organization(){
  const a=await currentAccess();
  if(!a?.appRoles.includes("COMMAND"))redirect("/");

  let roles:any[]=[];
  try{roles=await getGuildRoles()}catch{}

  const [ranks,divisions,subdivisions]=await Promise.all([
    prisma.rank.findMany({orderBy:{priority:"desc"},include:{_count:{select:{officers:true}}}}),
    prisma.division.findMany({orderBy:{name:"asc"},include:{_count:{select:{officers:true}}}}),
    prisma.subdivision.findMany({orderBy:{name:"asc"}})
  ]);
  const names=new Map(roles.map(r=>[r.id,r.name]));
  const mappedRanks=ranks.filter(r=>r.discordRoleId).length;

  return <main className="subpage">
    <Link href="/admin" className="back">← Administration</Link>
    <div className="pagetop"><div><p className="eyebrow">ORGANIZATION CONTROL</p><h1>Ranks & Divisions</h1><p>Map each department rank to a Discord role. Officers are assigned the highest-priority mapped rank automatically.</p></div><span className="connpill online">{mappedRanks}/{ranks.length} RANKS MAPPED</span></div>
    <section className="panel"><div className="paneltitle"><div><b>Automatic Rank Authority</b><span>Discord is the source of truth for officer rank</span></div></div><p className="hint">When an officer signs in or uses a protected Z6PD page, their Discord roles are checked. If several mapped rank roles are present, the rank with the highest Z6PD priority is assigned. Removing all mapped rank roles makes the website rank Unassigned.</p></section>
    <OrganizationManager roles={roles} divisions={divisions}/>
    <OrganizationEditor roles={roles} ranks={ranks} divisions={divisions} subdivisions={subdivisions}/>
    <div className="twocol">
      <section className="panel setting"><div className="paneltitle"><div><b>Department Ranks</b><span>Highest priority wins during automatic Discord sync</span></div></div>{ranks.map(x=><div className="mappingrow" key={x.id}><span><b>{x.name}</b><small>{x._count.officers} personnel · Priority {x.priority}</small></span><em>{x.discordRoleId?names.get(x.discordRoleId)||"ROLE LINKED":"NO ROLE"}</em></div>)}</section>
      <section className="panel setting"><div className="paneltitle"><div><b>Divisions</b><span>Operational assignments remain managed separately</span></div></div>{divisions.map(x=><div className="mappingrow" key={x.id}><span><b>{x.name}</b><small>{x._count.officers} personnel</small></span><em>{x.discordRoleId?names.get(x.discordRoleId)||"ROLE LINKED":"NO ROLE"}</em></div>)}</section>
    </div>
  </main>;
}
