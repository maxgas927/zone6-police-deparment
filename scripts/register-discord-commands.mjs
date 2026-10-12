const commands = [
  { name: "promote", description: "Request a promotion", options: [
    { name: "officer", description: "Officer", type: 6, required: true },
    { name: "rank", description: "Target rank", type: 3, required: true },
    { name: "reason", description: "Reason", type: 3, required: true }
  ] },
  { name: "demote", description: "Request a demotion", options: [
    { name: "officer", description: "Officer", type: 6, required: true },
    { name: "rank", description: "Target rank", type: 3, required: true },
    { name: "reason", description: "Reason", type: 3, required: true }
  ] },
  { name: "rankstatus", description: "View your department rank" }
];
const { DISCORD_BOT_TOKEN: token, DISCORD_CLIENT_ID: app, DISCORD_GUILD_ID: guild } = process.env;
if (!token || !app || !guild) throw new Error("Missing Discord environment configuration");
const response = await fetch(`https://discord.com/api/v10/applications/${app}/guilds/${guild}/commands`, {
  method: "PUT",
  headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(commands)
});
if (!response.ok) throw new Error(`Discord command registration failed: ${response.status}`);
console.log("Registered", (await response.json()).length, "commands");
