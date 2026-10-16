import {NextRequest,NextResponse} from "next/server";
import {currentUser,allowMutation} from "@/lib/auth";
import {getPrisma} from "@/lib/prisma";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 if(!allowMutation(req))return NextResponse.json({error:"Invalid origin"},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const data=await req.json().catch(()=>null);
 if(!data||typeof data.quizId!=="string"||!Array.isArray(data.answers)||data.answers.length>50)return NextResponse.json({error:"Bad request"},{status:400});
 const db=getPrisma(),q=await db.quiz.findUnique({where:{id:data.quizId}});
 if(!q||(q.visibility==="private"&&q.ownerId!==user.id))return NextResponse.json({error:"Quiz unavailable"},{status:404});
 const questions=JSON.parse(q.questions) as {correctIndex:number;explanation:string}[];
 if(data.answers.length!==questions.length||data.answers.some((x:unknown)=>!Number.isInteger(x)||Number(x)<-1||Number(x)>5))return NextResponse.json({error:"Invalid answers"},{status:400});
 const score=questions.filter((x,i)=>x.correctIndex===data.answers[i]).length;
 // Community practice intentionally awards no XP: the player could inspect answers from another session.
 return NextResponse.json({score,total:questions.length,details:questions.map((x,i)=>({correctIndex:x.correctIndex,explanation:x.explanation,correct:x.correctIndex===data.answers[i]}))});
}
