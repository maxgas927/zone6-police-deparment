declare global {
  var __z6pdLastDepartmentDiscordSyncAt: number | undefined;
  var __z6pdNextDepartmentDiscordSyncAt: number | undefined;
}

let started=false;

export async function register(){
  if(started||process.env.NEXT_RUNTIME!=="nodejs")return;
  started=true;

  const {fullDepartmentDiscordSync}=await import("./lib/full-discord-sync");
  const run=async()=>{
    const startedAt=Date.now();
    globalThis.__z6pdNextDepartmentDiscordSyncAt=startedAt+60000;
    try{
      const result=await fullDepartmentDiscordSync();
      globalThis.__z6pdLastDepartmentDiscordSyncAt=Date.now();
      console.log("DISCORD_DEPARTMENT_AUTO_SYNC",result);
    }catch(error){
      console.error("DISCORD_DEPARTMENT_AUTO_SYNC_FAILED",error);
    }
  };

  await run();
  const timer=setInterval(run,60000);
  timer.unref();
}
