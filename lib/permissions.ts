export const permissions=["personnel.read","personnel.manage","reports.create","reports.review","patrol.use","training.manage","discipline.read","discipline.manage","discord.manage","admin.manage"] as const;
export type Permission=typeof permissions[number];
export const rolePermissions:Record<string,Permission[]>={
OFFICER:["personnel.read","reports.create","patrol.use"],
SUPERVISOR:["personnel.read","personnel.manage","reports.create","reports.review","patrol.use"],
FTO:["personnel.read","reports.create","patrol.use","training.manage"],
IA:["personnel.read","reports.create","discipline.read","discipline.manage"],
COMMAND:[...permissions]
};
export function can(role:string|undefined,permission:Permission){return !!role&&rolePermissions[role]?.includes(permission)===true}
