import {NextResponse} from "next/server";
import {requirePermission} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
export const dynamic="force-dynamic";
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const a=await requirePermission("personnel.manage");
 if(!a)return NextResponse.json({error:"Forbidden"},{status:403});
 const {id}=await params;
 let body:Record<string,unknown>;
 try{body=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 if(typeof body.body!=="string")return NextResponse.json({error:"Note text is required."},{status:400});
 const note=body.body.trim();
 if(!note||note.length>2000)return NextResponse.json({error:"Note must be 1–2000 characters."},{status:400});
 const officer=await prisma.officer.findUnique({where:{id},select:{id:true}});
 if(!officer)return NextResponse.json({error:"Personnel file not found."},{status:404});
 const created=await prisma.$transaction(async tx=>{
  const item=await tx.personnelNote.create({data:{officerId:id,authorId:a.user.id,authorName:a.user.name||"Supervisor",body:note}});
  await tx.auditLog.create({data:{actorId:a.user.id,action:"SUPERVISOR_NOTE_CREATED",entity:"Officer",entityId:id,metadata:{noteId:item.id}}});
  return item;
 });
 return NextResponse.json({id:created.id,createdAt:created.createdAt},{status:201});
}