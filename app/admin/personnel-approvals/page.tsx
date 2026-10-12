import Link from "next/link";
import {redirect} from "next/navigation";
import {requirePermission} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
import ApprovalConsole from "./ApprovalConsole";
export const dynamic="force-dynamic";
export default async function PersonnelApprovals(){
 const a=await requirePermission("admin.manage");
 if(!a)redirect("/");
 const [officers,ranks,divisions,requests]=await Promise.all([
  prisma.officer.findMany({select:{id:true,badgeNumber:true,user:{select:{name:true}}},orderBy:{badgeNumber:"asc"}}),
  prisma.rank.findMany({select:{id:true,name:true},orderBy:{priority:"desc"}}),
  prisma.division.findMany({select:{id:true,name:true},orderBy:{name:"asc"}}),
  prisma.personnelChangeRequest.findMany({orderBy:{createdAt:"desc"},take:100})
 ]);
 return <main className="subpage"><Link href="/admin" className="back">← Administration</Link>
 <div className="pagetop"><div><p className="eyebrow">V9.3 · COMMAND WORKFLOWS</p><h1>Personnel Approvals</h1><p>Request and review promotions, demotions and division transfers. The requester cannot approve their own request.</p></div></div>
 <section className="panel"><p className="hint">Discord remains the authority for rank assignments. Approved website rank changes may be replaced by the next Discord role synchronization unless the corresponding Discord rank role is updated.</p></section>
 <ApprovalConsole officers={officers} ranks={ranks} divisions={divisions} requests={requests} userId={a.user.id}/></main>;
}
