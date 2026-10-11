# Zone6 Police Department

Z6PD Department Management System — V1 foundation.

## Included
- Responsive dark MDT-style command dashboard
- Personnel status/roster UI
- Patrol/report/training/fleet/armory navigation foundation
- Discord integration status and role-mapping foundation
- Prisma/PostgreSQL data model for users, officers, ranks, divisions, patrol sessions, reports and audit logs
- Environment template for Discord OAuth, bot and guild configuration

## Run locally
1. Install Node.js 20+
2. Run `npm install`
3. Copy `.env.example` to `.env.local` and configure values
4. Create PostgreSQL database and run `npx prisma migrate dev --name init`
5. Run `npm run dev`

## Discord setup
Create a Discord application/bot in the Discord Developer Portal. Never commit the bot token. Add OAuth credentials, Guild ID and bot token to environment variables. Role synchronization will be implemented against the `Rank`, `Division`, and `DiscordRoleMapping` models.

## V1 next milestones
Authentication, real database-backed personnel CRUD, RBAC permissions, Discord OAuth/guild verification, bidirectional role sync, reports/patrol workflows, and full audit logging.
