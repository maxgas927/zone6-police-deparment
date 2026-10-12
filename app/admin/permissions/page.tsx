import Link from "next/link";
import {redirect} from "next/navigation";
import {currentAccess} from "@/lib/authz";
import {permissions} from "@/lib/permissions";
import {effectiveMatrix,editableRoles} from "@/lib/effective-permissions";
import PermissionEditor from "./PermissionEditor";
export const dynamic="force-dynamic";
export default async function PermissionMatrix(){
 const a=await currentAccess();
 if(!a?.member||!a.appRoles.includes("COMMAND"))redirect("/");
 const matrix=await effectiveMatrix();
 return <main className="subpage"><Link className="back" href="/admin">← Administration</Link><div className="pagetop"><div><p className="eyebrow">V9.9.2 · ACCESS CONTROL</p><h1>Editable Permission Matrix</h1><p>Command can grant or revoke permissions for each website access group. Changes take effect on the next authorization check.</p></div></div><PermissionEditor initial={matrix} roles={[...editableRoles]} permissions={[...permissions]}/></main>;
}
