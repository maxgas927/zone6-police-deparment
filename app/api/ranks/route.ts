import { prisma } from "@/lib/prisma";import { NextResponse } from "next/server";
export async function GET(){return NextResponse.json(await prisma.rank.findMany({orderBy:{priority:"desc"}}))}
export async function POST(req:Request){const b=await req.json();if(!b.name)return NextResponse.json({error:"name required"},{status:400});return NextResponse.json(await prisma.rank.create({data:{name:String(b.name),priority:Number(b.priority||0),discordRoleId:b.discordRoleId||null}}),{status:201})}
