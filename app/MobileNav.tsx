"use client";
import Link from "next/link";import {usePathname} from "next/navigation";import {LayoutDashboard,Users,Radio,Bell,Settings} from "lucide-react";
const items=[{href:"/",name:"Home",Icon:LayoutDashboard},{href:"/personnel",name:"Roster",Icon:Users},{href:"/patrol",name:"Patrol",Icon:Radio},{href:"/notifications",name:"Alerts",Icon:Bell},{href:"/me",name:"Me",Icon:Settings}];
export default function MobileNav(){const pathname=usePathname();return <nav className="v91-mobile-nav" aria-label="Quick navigation">{items.map(({href,name,Icon})=><Link key={href} href={href} aria-current={pathname===href?"page":undefined} className={pathname===href?"active":""}><Icon size={19}/><span>{name}</span></Link>)}</nav>}
