const url=process.env.Z6PD_SYNC_URL;
const secret=process.env.Z6PD_SYNC_CRON_SECRET;

if(!url||!secret){
  console.error("Missing Z6PD_SYNC_URL or Z6PD_SYNC_CRON_SECRET");
  process.exit(1);
}

try{
  const response=await fetch(url,{
    method:"POST",
    headers:{Authorization:"Bearer "+secret,"Content-Type":"application/json"}
  });
  const body=await response.text();
  console.log("Discord full sync:",response.status,body);
  if(!response.ok)process.exit(1);
}catch(error){
  console.error("Discord full sync request failed",error);
  process.exit(1);
}
