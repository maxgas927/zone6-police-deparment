import Link from "next/link";
import {redirect} from "next/navigation";
import {prisma} from "@/lib/prisma";
import {currentAccess} from "@/lib/authz";
import DutyControl from "@/app/patrol/DutyControl";

export const dynamic="force-dynamic";

function hours(minutes:number){
  return Math.round((minutes/60)*10)/10;
}

export default async function MyDashboard(){
  const access=await currentAccess();
  if(!access?.member||!access.appRoles.length)redirect("/");

  const now=new Date();
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const thirtyDaysAgo=new Date(now.getTime()-30*86400000);
  const soon=new Date(now.getTime()+30*86400000);

  const officer=await prisma.officer.findUnique({
    where:{userId:access.user.id},
    include:{
      user:true,
      rank:true,
      division:true,
      subdivision:true,
      patrols:{where:{endedAt:null},orderBy:{startedAt:"desc"},take:1},
      reports:{orderBy:{createdAt:"desc"},take:5},
      trainingRecords:{include:{course:true},orderBy:{issuedAt:"desc"}},
      leaveRequests:{orderBy:{createdAt:"desc"},take:5},
      shifts:{where:{endsAt:{gte:now}},orderBy:{startsAt:"asc"},take:5},
      commendations:{orderBy:{issuedAt:"desc"},take:5},
      fleetVehicles:true,
      equipmentAssets:true
    }
  });

  if(!officer){
    return <main className="subpage officerhome">
      <Link href="/" className="back">← Command Center</Link>
      <section className="panel empty">
        Your personnel file is still being created from Discord. It will appear automatically after the next sync.
      </section>
    </main>;
  }

  const [
    allPatrol,
    monthPatrol,
    reports30,
    draftReports,
    returnedReports,
    pendingDocs,
    announcements,
    audits
  ]=await Promise.all([
    prisma.patrolSession.aggregate({where:{officerId:officer.id},_sum:{minutes:true}}),
    prisma.patrolSession.aggregate({where:{officerId:officer.id,startedAt:{gte:monthStart}},_sum:{minutes:true}}),
    prisma.report.count({where:{officerId:officer.id,createdAt:{gte:thirtyDaysAgo}}}),
    prisma.report.count({where:{officerId:officer.id,status:"DRAFT"}}),
    prisma.report.count({where:{officerId:officer.id,status:"RETURNED"}}),
    prisma.policyDocument.count({where:{published:true,requiredAck:true,acknowledgements:{none:{userId:access.user.id}}}}),
    prisma.announcement.findMany({where:{published:true},orderBy:{createdAt:"desc"},take:3}),
    prisma.auditLog.findMany({where:{actorId:access.user.id},orderBy:{createdAt:"desc"},take:6})
  ]);

  const activePatrol=officer.patrols[0];
  const activeMinutes=activePatrol?Math.max(0,Math.floor((Date.now()-activePatrol.startedAt.getTime())/60000)):0;
  const totalMinutes=(allPatrol._sum.minutes||0)+activeMinutes;
  const monthMinutes=(monthPatrol._sum.minutes||0)+(activePatrol&&activePatrol.startedAt>=monthStart?activeMinutes:0);

  const expiredTraining=officer.trainingRecords.filter(record=>record.expiresAt&&record.expiresAt<=now);
  const expiringTraining=officer.trainingRecords.filter(record=>record.expiresAt&&record.expiresAt>now&&record.expiresAt<=soon);
  const overdueEquipment=officer.equipmentAssets.filter(asset=>asset.status==="ISSUED"&&asset.dueAt&&asset.dueAt<now);
  const activeLoa=officer.leaveRequests.find(request=>request.status==="APPROVED"&&request.endDate>=now);
  const nextShift=officer.shifts[0];

  const alerts=[
    pendingDocs?{href:"/documents",title:pendingDocs+" document"+(pendingDocs===1?"":"s")+" require acknowledgement",meta:"Department policy action required",tone:"warning"}:null,
    returnedReports?{href:"/reports",title:returnedReports+" returned report"+(returnedReports===1?"":"s"),meta:"Corrections or resubmission may be required",tone:"critical"}:null,
    draftReports?{href:"/reports",title:draftReports+" report draft"+(draftReports===1?"":"s"),meta:"Finish or submit your open report work",tone:"normal"}:null,
    expiredTraining.length?{href:"/training",title:expiredTraining.length+" expired certification"+(expiredTraining.length===1?"":"s"),meta:"Training record requires attention",tone:"critical"}:null,
    expiringTraining.length?{href:"/training",title:expiringTraining.length+" certification"+(expiringTraining.length===1?"":"s")+" expiring soon",meta:"Expires within 30 days",tone:"warning"}:null,
    overdueEquipment.length?{href:"/armory",title:overdueEquipment.length+" overdue equipment item"+(overdueEquipment.length===1?"":"s"),meta:"Review equipment accountability",tone:"warning"}:null
  ].filter(Boolean) as {href:string;title:string;meta:string;tone:string}[];

  return <main className="subpage officerhome">
    <Link href="/" className="back">← Command Center</Link>

    <section className="officerhomehero panel">
      <div className="officeridentity">
        {officer.user.image
          ?<img className="officeravatar discordpfp" src={officer.user.image} alt={(officer.user.name||"Officer")+" Discord profile"}/>
          :<div className="officeravatar">{(officer.user.name||"O").slice(0,1)}</div>}
        <div>
          <p className="eyebrow">MY Z6PD · OFFICER HOME V3</p>
          <h1>{officer.user.name||"Officer"}</h1>
          <p>{officer.callsign||"No Callsign"} · Badge #{officer.badgeNumber} · {officer.rank?.name||"Unassigned"}</p>
          <div className="accesschips">
            <span>{officer.division?.name||"No Division"}</span>
            {officer.subdivision&&<span>{officer.subdivision.name}</span>}
            <span>{officer.status}</span>
          </div>
        </div>
      </div>
      <div className="officerhomestatus">
        <small>CURRENT DUTY STATUS</small>
        <b>{officer.dutyStatus.replaceAll("_"," ")}</b>
        <span>{activeLoa?"Approved LOA through "+activeLoa.endDate.toLocaleDateString():"Personnel record active"}</span>
      </div>
    </section>

    <DutyControl active={!!activePatrol} startedAt={activePatrol?.startedAt.toISOString()}/>

    <section className="officerhomestats">
      <div className="panel"><strong>{hours(monthMinutes)}</strong><b>Patrol Hours</b><span>This month</span></div>
      <div className="panel"><strong>{hours(totalMinutes)}</strong><b>Career Patrol Hours</b><span>Recorded in Z6PD</span></div>
      <div className="panel"><strong>{reports30}</strong><b>Reports Filed</b><span>Last 30 days</span></div>
      <div className="panel"><strong>{officer.commendations.length}</strong><b>Recognition</b><span>Recent awards</span></div>
    </section>

    <div className="officerhomegrid">
      <section className="panel officeractioncenter">
        <div className="paneltitle"><div><b>Action Center</b><span>Items that need your attention</span></div><span>{alerts.length}</span></div>
        {alerts.length?alerts.map(alert=>
          <Link href={alert.href} className={"officeralert "+alert.tone} key={alert.title}>
            <span><b>{alert.title}</b><small>{alert.meta}</small></span><em>OPEN →</em>
          </Link>
        ):<div className="empty compact">You have no outstanding action items.</div>}
      </section>

      <section className="panel">
        <div className="paneltitle"><div><b>Next Assignment</b><span>Your upcoming scheduled shift</span></div></div>
        {nextShift?
          <div className="nextassignment">
            <span className="connpill online">{nextShift.status}</span>
            <h3>{nextShift.title}</h3>
            <p>{nextShift.startsAt.toLocaleString()} → {nextShift.endsAt.toLocaleString()}</p>
            <small>{nextShift.assignment||"No assignment notes"}{nextShift.supervisor?" · Supervisor: "+nextShift.supervisor:""}</small>
            <Link href="/schedule" className="outline">Open Schedule</Link>
          </div>
          :<div className="empty compact">No upcoming shift is scheduled.</div>}
      </section>

      <section className="panel">
        <div className="paneltitle"><div><b>Quick Actions</b><span>Start common officer workflows</span></div></div>
        <div className="officerquickactions">
          <Link href="/reports/new"><b>New Report</b><span>Start an incident or departmental report</span></Link>
          <Link href="/records"><b>Records</b><span>Create an arrest or citation record</span></Link>
          <Link href="/evidence"><b>Evidence</b><span>Review or log evidence</span></Link>
          <Link href="/loa"><b>Request LOA</b><span>Submit or review leave status</span></Link>
        </div>
      </section>

      <section className="panel">
        <div className="paneltitle"><div><b>Department Announcements</b><span>Latest official updates</span></div><Link href="/announcements">View all</Link></div>
        {announcements.length?announcements.map(item=>
          <div className="officerannouncement" key={item.id}>
            <span><b>{item.title}</b><small>{item.priority} · {item.createdAt.toLocaleDateString()}</small></span>
            <p>{item.body}</p>
          </div>
        ):<div className="empty compact">No announcements published.</div>}
      </section>

      <section className="panel">
        <div className="paneltitle"><div><b>Training Status</b><span>Certification readiness</span></div><Link href="/training">Open Training</Link></div>
        <div className="profilefacts">
          <span><small>Total Certifications</small><b>{officer.trainingRecords.length}</b></span>
          <span><small>Expiring Soon</small><b>{expiringTraining.length}</b></span>
          <span><small>Expired</small><b>{expiredTraining.length}</b></span>
          <span><small>Required Docs</small><b>{pendingDocs}</b></span>
        </div>
      </section>

      <section className="panel">
        <div className="paneltitle"><div><b>Assigned Resources</b><span>Vehicles and equipment on your file</span></div></div>
        <div className="profilefacts">
          <span><small>Fleet Units</small><b>{officer.fleetVehicles.length}</b></span>
          <span><small>Equipment</small><b>{officer.equipmentAssets.length}</b></span>
          <span><small>Overdue</small><b>{overdueEquipment.length}</b></span>
          <span><small>Division</small><b>{officer.division?.name||"—"}</b></span>
        </div>
      </section>

      <section className="panel">
        <div className="paneltitle"><div><b>Recent Reports</b><span>Your latest authored reports</span></div><Link href="/reports">View all</Link></div>
        {officer.reports.length?officer.reports.map(report=>
          <Link href={"/reports/"+report.id} className="profileline" key={report.id}>
            <span><b>{report.number} · {report.title}</b><small>{report.type} · {report.createdAt.toLocaleDateString()}</small></span>
            <em>{report.status}</em>
          </Link>
        ):<div className="empty compact">No reports filed yet.</div>}
      </section>

      <section className="panel">
        <div className="paneltitle"><div><b>Your Activity</b><span>Recent actions recorded by Z6PD</span></div></div>
        {audits.length?audits.map(item=>
          <div className="profileline" key={item.id}>
            <span><b>{item.action.replaceAll("_"," ")}</b><small>{item.entity}{item.entityId?" · "+item.entityId:""}</small></span>
            <em>{item.createdAt.toLocaleDateString()}</em>
          </div>
        ):<div className="empty compact">No personal audit activity recorded.</div>}
      </section>
    </div>
  </main>;
}
