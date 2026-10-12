import Link from "next/link";
import {redirect} from "next/navigation";
import {prisma} from "@/lib/prisma";
import {currentAccess} from "@/lib/authz";
import {can} from "@/lib/permissions";
import EditPersonnelForm from "../[id]/edit/EditPersonnelForm";
export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<{id?:string}>}){
  const {id}=await searchParams;
  if(!id)redirect("/personnel");
  const access=await currentAccess();
  if(!access?.appRoles.some(r=>can(r,"personnel.manage")))redirect("/personnel");
  const officer=await prisma.officer.findUnique({where:{id},include:{user:true,rank:true}});
  if(!officer)redirect("/personnel");

  const [divisions,subdivisions]=await Promise.all([
    prisma.division.findMany({orderBy:{name:"asc"},select:{id:true,name:true}}),
    prisma.subdivision.findMany({orderBy:{name:"asc"},select:{id:true,name:true,divisionId:true}})
  ]);

  return <main className="subpage narrow">
    <Link href={"/personnel/"+id} className="back">← Officer Profile</Link>
    <div className="pagetop"><div><p className="eyebrow">PERSONNEL MANAGEMENT</p><h1>Edit Personnel</h1><p>Rank is controlled by Discord. Update local personnel details below.</p></div></div>
    <EditPersonnelForm officer={officer} divisions={divisions} subdivisions={subdivisions}/>
  </main>;
}
