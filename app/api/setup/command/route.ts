import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getGuildRoles,getGuildMember } from "@/lib/discord";
import { timingSafeEqual } from "node:crypto";
export const dynamic="force-dynamic";
function same(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
export async function POST(req:Request){
  const secret=process.env.Z6PD_BOOTSTRAP_SECRET;
  if(!secret||secret.length<32)return NextResponse.json({error:"Bootstrap is not enabled. Configure Z6PD_BOOTSTRAP_SECRET (at least 32 characters) on Render."},{status:503});
  const session=await auth();
  if(!session?.user?.email)return NextResponse.json({error:"Sign in with Discord first."},{status:401});
  const supplied=req.headers.get("x-z6pd-bootstrap-secret")||"";
  if(!same(secret,supplied))return NextResponse.json({error:"Invalid setup key."},{status:403});
  const account=await prisma.account.findFirst({where:{provider:"discord",user:{email:session.user.email}},include:{user:true}});
  if(!account)return NextResponse.json({error:"Discord account required."},{status:403});
  const [roles,member]=await Promise.all([getGuildRoles(),getGuildMember(account.providerAccountId)]);
  const manager=roles.find(r=>r.name.trim().toLowerCase()==="manager"&&!r.managed);
  if(!manager)return NextResponse.json({error:"No assignable Manager role was found in this Discord server."},{status:404});
  if(!member?.roles.includes(manager.id))return NextResponse.json({error:"Your Discord account must already have the Manager role."},{status:403});
  try{
    const result=await prisma.$transaction(async tx=>{
      await tx.$executeRawUnsafe('LOCK TABLE "DiscordRoleMapping" IN EXCLUSIVE MODE');
      const existing=await tx.discordRoleMapping.count({where:{appRole:"COMMAND"}});
      if(existing)return false;
      const mapping=await tx.discordRoleMapping.create({data:{discordRoleId:manager.id,label:"Manager",appRole:"COMMAND",syncEnabled:true}});
      await tx.auditLog.create({data:{actorId:account.userId,action:"INITIAL_COMMAND_BOOTSTRAP",entity:"DiscordRoleMapping",entityId:mapping.id,metadata:{discordRoleId:manager.id}}});
      return true;
    });
    if(!result)return NextResponse.json({error:"Command role is already configured; bootstrap is closed."},{status:409});
    return NextResponse.json({ok:true,message:"Manager role is now mapped to Command. Remove Z6PD_BOOTSTRAP_SECRET from Render."});
  }catch{return NextResponse.json({error:"Could not finish setup. Check database connection and try again."},{status:500})}
}
