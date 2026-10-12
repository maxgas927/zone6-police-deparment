export const dynamic="force-dynamic";
import {NextResponse} from "next/server";
import {requirePermission} from "@/lib/authz";
import {getGuildRoles} from "@/lib/discord";
import {discoverPoliceRanks} from "@/lib/rank-discovery";
import {prisma} from "@/lib/prisma";
export async function GET(){
 const a=await requirePermission("admin.manage");
 if(!a)return NextResponse.json({error:"Forbidden"},{status:403});
 try{const ranks=discoverPoliceRanks(await getGuildRoles());return NextResponse.json({ranks:ranks.map((r,i)=>({id:r.id,name:r.name,priority:(ranks.length-i)*100}))})}
 catch{return NextResponse.json({error:"Unable to read Discord roles"},{status:502})}
}
export async function POST(req:Request){
 const a=await requirePermission("admin.manage");
 if(!a)return NextResponse.json({error:"Forbidden"},{status:403});
 const b=await req.json().catch(()=>null);
 if(!Array.isArray(b?.roleIds)||b.roleIds.length>80||!b.roleIds.every((x:unknown)=>typeof x==="string"))return NextResponse.json({error:"Invalid selection"},{status:400});
 const roles=discoverPoliceRanks(await getGuildRoles());
 const selected=new Set(b.roleIds as string[]);
 const ranks=roles.filter(r=>selected.has(r.id));
 if(!ranks.length||ranks.length!==selected.size)return NextResponse.json({error:"Discord roles changed; refresh preview"},{status:409});
 const existing=await prisma.rank.findMany();
 for(const r of ranks){
  const conflicts=existing.filter(x=>x.name===r.name||x.discordRoleId===r.id);
  if(conflicts.length>1||conflicts.some(x=>x.discordRoleId&&x.discordRoleId!==r.id))return NextResponse.json({error:"Existing rank conflict: "+r.name},{status:409});
 }
 const result=await prisma.$transaction(async tx=>{
  let created=0,updated=0;
  for(let i=0;i<ranks.length;i++){
   const r=ranks[i],match=existing.find(x=>x.discordRoleId===r.id||x.name===r.name);
   if(match){await tx.rank.update({where:{id:match.id},data:{name:r.name,discordRoleId:r.id,priority:(ranks.length-i)*100}});updated++}
   else{await tx.rank.create({data:{name:r.name,discordRoleId:r.id,priority:(ranks.length-i)*100}});created++}
  }
  await tx.auditLog.create({data:{actorId:a.user.id,action:"DISCORD_RANK_IMPORT",entity:"Rank",entityId:"discord",metadata:{created,updated,roleIds:ranks.map(r=>r.id)}}});
  return {created,updated,highest:ranks[0].name,lowest:ranks[ranks.length-1].name};
 });
 return NextResponse.json(result);
}
