import {NextRequest,NextResponse} from "next/server";
import {currentUser,allowMutation} from "@/lib/auth";
import {getPrisma} from "@/lib/prisma";
export const runtime="nodejs";
const fail=(error:string,status:number)=>NextResponse.json({error},{status});
async function admin(){
 const user=await currentUser();
 if(!user)return null;
 const allowed=(process.env.COMMUNITY_ADMIN_USER_IDS||"").split(",").map(v=>v.trim()).filter(Boolean);
 return allowed.includes(user.id)?user:null;
}
export async function GET(){
 if(!await admin())return fail("Forbidden",403);
 const db=getPrisma();
 const reports=await db.quizReport.findMany({orderBy:{createdAt:"desc"},take:100});
 const quizzes=await db.quiz.findMany({where:{id:{in:reports.map(r=>r.quizId)}},select:{id:true,title:true,visibility:true,ownerId:true}});
 return NextResponse.json({reports:reports.map(r=>({...r,quiz:quizzes.find(q=>q.id===r.quizId)||null}))});
}
export async function POST(req:NextRequest){
 if(!allowMutation(req))return fail("Invalid origin",403);
 if(!await admin())return fail("Forbidden",403);
 const body=await req.json().catch(()=>null);
 if(typeof body?.reportId!=="string"||!["dismiss","hide"].includes(body?.action))return fail("Invalid request",400);
 const db=getPrisma(),report=await db.quizReport.findUnique({where:{id:body.reportId}});
 if(!report)return fail("Report not found",404);
 await db.$transaction(async tx=>{
  if(body.action==="hide")await tx.quiz.updateMany({where:{id:report.quizId},data:{visibility:"private"}});
  await tx.quizReport.deleteMany({where:{quizId:report.quizId}});
 });
 return NextResponse.json({ok:true});
}
