import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req:Request) {
  const secret=process.env.CRON_SECRET;
  if(!secret || req.headers.get("authorization")!==`Bearer ${secret}`)
    return NextResponse.json({error:"Unauthorized"},{status:401});
  try {
    const db=getPrisma();
    const now=Math.floor(Date.now()/1000);
    const expiredRateLimits=await db.authRateLimit.deleteMany({where:{expiresAt:{lt:now}}});
    const expiredSessions=await db.activeLogin.deleteMany({where:{expiresAt:{lt:new Date()}}});
    return NextResponse.json({ok:true,expiredRateLimits:expiredRateLimits.count,expiredSessions:expiredSessions.count},{headers:{"Cache-Control":"no-store"}});
  }catch(e){console.error("Daily cleanup failed",e);return NextResponse.json({error:"Cleanup failed"},{status:500});}
}
