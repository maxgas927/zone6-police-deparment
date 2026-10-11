-- Initial Z6PD schema
CREATE TYPE "OfficerStatus" AS ENUM ('ACTIVE','LOA','SUSPENDED','TERMINATED');
CREATE TYPE "DutyStatus" AS ENUM ('OFF_DUTY','AVAILABLE','ON_DUTY','BUSY');

CREATE TABLE "User" ("id" TEXT NOT NULL,"discordId" TEXT,"email" TEXT,"emailVerified" TIMESTAMP(3),"name" TEXT,"image" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Account" ("id" TEXT NOT NULL,"userId" TEXT NOT NULL,"type" TEXT NOT NULL,"provider" TEXT NOT NULL,"providerAccountId" TEXT NOT NULL,"refresh_token" TEXT,"access_token" TEXT,"expires_at" INTEGER,"token_type" TEXT,"scope" TEXT,"id_token" TEXT,"session_state" TEXT,CONSTRAINT "Account_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Session" ("id" TEXT NOT NULL,"sessionToken" TEXT NOT NULL,"userId" TEXT NOT NULL,"expires" TIMESTAMP(3) NOT NULL,CONSTRAINT "Session_pkey" PRIMARY KEY ("id"));
CREATE TABLE "VerificationToken" ("identifier" TEXT NOT NULL,"token" TEXT NOT NULL,"expires" TIMESTAMP(3) NOT NULL);
CREATE TABLE "Rank" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"priority" INTEGER NOT NULL DEFAULT 0,"discordRoleId" TEXT,CONSTRAINT "Rank_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Division" ("id" TEXT NOT NULL,"name" TEXT NOT NULL,"discordRoleId" TEXT,CONSTRAINT "Division_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Officer" ("id" TEXT NOT NULL,"userId" TEXT NOT NULL,"badgeNumber" TEXT NOT NULL,"callsign" TEXT,"rankId" TEXT,"divisionId" TEXT,"status" "OfficerStatus" NOT NULL DEFAULT 'ACTIVE',"dutyStatus" "DutyStatus" NOT NULL DEFAULT 'OFF_DUTY',"hiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Officer_pkey" PRIMARY KEY ("id"));
CREATE TABLE "PatrolSession" ("id" TEXT NOT NULL,"officerId" TEXT NOT NULL,"startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"endedAt" TIMESTAMP(3),"minutes" INTEGER,CONSTRAINT "PatrolSession_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Report" ("id" TEXT NOT NULL,"number" TEXT NOT NULL,"title" TEXT NOT NULL,"type" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'DRAFT',"narrative" TEXT,"officerId" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Report_pkey" PRIMARY KEY ("id"));
CREATE TABLE "DiscordRoleMapping" ("id" TEXT NOT NULL,"discordRoleId" TEXT NOT NULL,"label" TEXT,"appRole" TEXT NOT NULL,"syncEnabled" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "DiscordRoleMapping_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AuditLog" ("id" TEXT NOT NULL,"actorId" TEXT,"action" TEXT NOT NULL,"entity" TEXT NOT NULL,"entityId" TEXT,"metadata" JSONB,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider","providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier","token");
CREATE UNIQUE INDEX "Officer_userId_key" ON "Officer"("userId");
CREATE UNIQUE INDEX "Officer_badgeNumber_key" ON "Officer"("badgeNumber");
CREATE UNIQUE INDEX "Officer_callsign_key" ON "Officer"("callsign");
CREATE UNIQUE INDEX "Rank_name_key" ON "Rank"("name");
CREATE UNIQUE INDEX "Rank_discordRoleId_key" ON "Rank"("discordRoleId");
CREATE UNIQUE INDEX "Division_name_key" ON "Division"("name");
CREATE UNIQUE INDEX "Division_discordRoleId_key" ON "Division"("discordRoleId");
CREATE UNIQUE INDEX "Report_number_key" ON "Report"("number");
CREATE UNIQUE INDEX "DiscordRoleMapping_discordRoleId_key" ON "DiscordRoleMapping"("discordRoleId");

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "Rank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Officer" ADD CONSTRAINT "Officer_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PatrolSession" ADD CONSTRAINT "PatrolSession_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "Officer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
