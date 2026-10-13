declare global {
 var __z6pdLastDepartmentDiscordSyncAt:number|undefined;
 var __z6pdNextDepartmentDiscordSyncAt:number|undefined;
 var __z6pdLastDepartmentDiscordSyncResult:Record<string,number|boolean>|undefined;
}
let started=false;
export async function register(){
 if(started||process.env.NEXT_RUNTIME!=="nodejs")return;
 started=true;
 const {fullDepartmentDiscordSync}=await import("./lib/full-discord-sync");
 let running=false;
 const run=async()=>{
  if(running)return;
  running=true;
  const startedAt=Date.now();
  globalThis.__z6pdNextDepartmentDiscordSyncAt=startedAt+900000;
  try{
   const result=await fullDepartmentDiscordSync();
   globalThis.__z6pdLastDepartmentDiscordSyncAt=Date.now();
   globalThis.__z6pdLastDepartmentDiscordSyncResult=result;
   console.log("DISCORD_DEPARTMENT_AUTO_SYNC",result);
  }catch(error){console.error("DISCORD_DEPARTMENT_AUTO_SYNC_FAILED",error)}
  finally{running=false}
 };
 await run();
 const timer=setInterval(run,900000);
 timer.unref();
}
