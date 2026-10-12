import Link from "next/link";
import {redirect} from "next/navigation";
import {currentAccess} from "@/lib/authz";
import {can} from "@/lib/permissions";
import {getDepartmentNotices} from "@/lib/notifications";
import NotificationControls from "./NotificationControls";
export const dynamic="force-dynamic";

export default async function Notifications(){
  const access=await currentAccess();
  if(!access?.member||!access.appRoles.some(role=>can(role,"personnel.read")))redirect("/");
  const notices=await getDepartmentNotices(access.user.id,access.appRoles);
  const unread=notices.filter(item=>!item.read).length;
  return <main className="subpage narrow">
    <Link href="/" className="back">← Command Center</Link>
    <div className="pagetop"><div>
      <p className="eyebrow">V9 · NOTIFICATION CENTER</p>
      <h1>My Notifications</h1>
      <p>Personal action items, department announcements, policy updates and approvals.</p>
    </div><span className="connpill online">{unread} UNREAD</span></div>
    <NotificationControls notices={notices.map(item=>({
      ...item,createdAt:item.createdAt.toISOString()
    }))}/>
  </main>;
}
