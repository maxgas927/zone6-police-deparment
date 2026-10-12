import {prisma} from "@/lib/prisma";
import {can} from "@/lib/permissions";

export type DepartmentNotice={
  key:string;
  title:string;
  detail:string;
  href:string;
  category:"REPORT"|"LEAVE"|"DOCUMENT"|"TRAINING"|"ANNOUNCEMENT"|"SYSTEM";
  createdAt:Date;
  urgent:boolean;
  read:boolean;
};

export async function getDepartmentNotices(userId:string,roles:string[]){
  const officer=await prisma.officer.findUnique({where:{userId}});
  const supervisor=roles.some(role=>can(role,"reports.review"));
  const manageLeave=roles.includes("SUPERVISOR")||roles.includes("COMMAND");
  const now=new Date();
  const thirtyDaysAgo=new Date(now.getTime()-30*86400000);
  const soon=new Date(now.getTime()+30*86400000);

  const [reports,leaves,documents,announcements,certifications]=await Promise.all([
    prisma.report.findMany({
      where:supervisor?{status:"SUBMITTED"}:{officerId:officer?.id||"none",status:"RETURNED"},
      orderBy:{updatedAt:"desc"},take:30
    }),
    prisma.leaveRequest.findMany({
      where:manageLeave?{status:"PENDING"}:{officerId:officer?.id||"none",status:{in:["APPROVED","DENIED"]},reviewedAt:{gte:thirtyDaysAgo}},
      orderBy:{updatedAt:"desc"},take:30
    }),
    prisma.policyDocument.findMany({
      where:{published:true,requiredAck:true,acknowledgements:{none:{userId}}},
      orderBy:{updatedAt:"desc"},take:30
    }),
    prisma.announcement.findMany({
      where:{published:true,createdAt:{gte:thirtyDaysAgo}},
      orderBy:{createdAt:"desc"},take:30
    }),
    officer?prisma.trainingRecord.findMany({
      where:{officerId:officer.id,expiresAt:{lte:soon}},
      include:{course:true},orderBy:{expiresAt:"asc"},take:30
    }):Promise.resolve([])
  ]);

  const notices:Omit<DepartmentNotice,"read">[]=[
    ...reports.map(item=>({
      key:"report:"+item.id+":"+item.updatedAt.toISOString(),
      title:supervisor?"Report awaiting review":"Report returned for correction",
      detail:item.number+" · "+item.title,
      href:"/reports/"+item.id,category:"REPORT" as const,
      createdAt:item.updatedAt,urgent:!supervisor
    })),
    ...leaves.map(item=>({
      key:"leave:"+item.id+":"+item.updatedAt.toISOString(),
      title:manageLeave?"Leave request awaiting approval":"Leave request "+item.status.toLowerCase(),
      detail:item.startDate.toLocaleDateString()+" – "+item.endDate.toLocaleDateString(),
      href:"/loa",category:"LEAVE" as const,createdAt:item.updatedAt,urgent:manageLeave
    })),
    ...documents.map(item=>({
      key:"document:"+item.id+":"+item.version,
      title:"Policy acknowledgement required",
      detail:item.title+" · v"+item.version,
      href:"/documents",category:"DOCUMENT" as const,createdAt:item.updatedAt,urgent:true
    })),
    ...announcements.map(item=>({
      key:"announcement:"+item.id,
      title:item.title,detail:item.body.slice(0,180),
      href:"/announcements",category:"ANNOUNCEMENT" as const,
      createdAt:item.createdAt,urgent:item.priority==="HIGH"||item.priority==="URGENT"
    })),
    ...certifications.map(item=>({
      key:"training:"+item.id+":"+item.expiresAt?.toISOString(),
      title:item.expiresAt&&item.expiresAt<now?"Certification expired":"Certification expiring",
      detail:item.course.name+" · "+(item.expiresAt?.toLocaleDateString()||""),
      href:"/training",category:"TRAINING" as const,
      createdAt:item.expiresAt||now,urgent:true
    }))
  ];

  notices.sort((a,b)=>Number(b.urgent)-Number(a.urgent)||b.createdAt.getTime()-a.createdAt.getTime());
  const reads=await prisma.notificationRead.findMany({
    where:{userId,key:{in:notices.map(item=>item.key)}},select:{key:true}
  });
  const seen=new Set(reads.map(item=>item.key));
  return notices.map(item=>({...item,read:seen.has(item.key)}));
}
