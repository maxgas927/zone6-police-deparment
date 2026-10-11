import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const {handlers,auth,signIn,signOut}=NextAuth({
  adapter:PrismaAdapter(prisma),
  trustHost:true,
  providers:[
    Discord({
      authorization:"https://discord.com/oauth2/authorize?scope=identify+email+guilds"
    })
  ]
});
