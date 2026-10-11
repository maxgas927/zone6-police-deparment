import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
export const {handlers,auth,signIn,signOut}=NextAuth({
 adapter:PrismaAdapter(prisma),trustHost:true,pages:{signIn:"/login"},
 providers:[Discord({issuer:"https://discord.com",authorization:{url:"https://discord.com/oauth2/authorize",params:{scope:"identify email guilds"}}})]
});