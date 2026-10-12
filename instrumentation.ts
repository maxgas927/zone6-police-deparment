let started=false;

export async function register(){
  if(started||process.env.NEXT_RUNTIME!=="nodejs")return;
  started=true;

  const {fullDepartmentDiscordSync}=await import("./lib/full-discord-sync");
  const run=async()=>{
    try{
      const result=await fullDepartmentDiscordSync();
      console.log("DISCORD_DEPARTMENT_AUTO_SYNC",result);
    }catch(error){
      console.error("DISCORD_DEPARTMENT_AUTO_SYNC_FAILED",error);
    }
  };

  await run();
  const timer=setInterval(run,60000);
  timer.unref();
}
