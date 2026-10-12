export const permissions=["personnel.read","personnel.manage","reports.create","reports.review","patrol.use","training.manage","discipline.read","discipline.manage","intelligence.read","intelligence.manage","records.create","evidence.manage","schedule.read","schedule.manage","discord.manage","admin.manage"] as const;
export type Permission=typeof permissions[number];
export const rolePermissions:Record<string,Permission[]>={
OFFICER:["personnel.read","reports.create","patrol.use","intelligence.read","records.create","schedule.read"],
SUPERVISOR:["personnel.read","personnel.manage","reports.create","reports.review","patrol.use","intelligence.read","intelligence.manage","records.create","evidence.manage","schedule.read","schedule.manage"],
FTO:["personnel.read","reports.create","patrol.use","training.manage","intelligence.read","records.create","schedule.read"],
IA:["personnel.read","reports.create","discipline.read","discipline.manage","intelligence.read","records.create","schedule.read"],
COMMAND:[...permissions]
};
export function can(role:string|undefined,permission:Permission){return !!role&&rolePermissions[role]?.includes(permission)===true}
