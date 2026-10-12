export const permissions=["personnel.read","personnel.manage","reports.create","reports.review","patrol.use","training.manage","discipline.read","discipline.manage","intelligence.read","intelligence.manage","records.create","evidence.read","evidence.manage","schedule.read","schedule.manage","documents.read","documents.manage","awards.read","awards.manage","discord.manage","admin.manage"] as const;
export type Permission=typeof permissions[number];
export const rolePermissions:Record<string,Permission[]>={
OFFICER:["personnel.read","reports.create","patrol.use","intelligence.read","records.create","evidence.read","schedule.read","documents.read","awards.read"],
SUPERVISOR:["personnel.read","personnel.manage","reports.create","reports.review","patrol.use","intelligence.read","intelligence.manage","records.create","evidence.read","evidence.manage","schedule.read","schedule.manage","documents.read","awards.read","awards.manage"],
FTO:["personnel.read","reports.create","patrol.use","training.manage","intelligence.read","records.create","evidence.read","schedule.read","documents.read","awards.read"],
IA:["personnel.read","reports.create","discipline.read","discipline.manage","intelligence.read","records.create","evidence.read","schedule.read","documents.read","awards.read"],
COMMAND:[...permissions]
};
export function can(role:string|undefined,permission:Permission){return !!role&&rolePermissions[role]?.includes(permission)===true}
