import {NextResponse} from "next/server";
import {currentUser} from "@/lib/auth";
import {getPrisma} from "@/lib/prisma";
export const runtime="nodejs";
export async function GET(){
 const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const db=getPrisma();const [profile,achievements,top]=await Promise.all([
 db.playerProfile.findUnique({where:{userId:user.id}}),db.playerAchievement.findMany({where:{userId:user.id},select:{code:true,createdAt:true}}),db.playerProfile.findMany({orderBy:[{xp:"desc"},{userId:"asc"}],take:20})]);
 const names=await db.user.findMany({where:{id:{in:top.map(p=>p.userId)}},select:{id:true,name:true}});
 const map=new Map(names.map(x=>[x.id,x.name]));
 return NextResponse.json({profile:profile||{xp:0,level:1,games:0,wins:0},achievements,leaderboard:top.map((x,i)=>({rank:i+1,name:map.get(x.userId)||"Người chơi",xp:x.xp,level:x.level,games:x.games}))});
}
