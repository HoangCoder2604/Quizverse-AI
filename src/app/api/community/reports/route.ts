import {NextRequest,NextResponse} from "next/server";
import {currentUser,allowMutation} from "@/lib/auth";
import {getPrisma} from "@/lib/prisma";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 if(!allowMutation(req))return NextResponse.json({error:"Invalid origin"},{status:403});
 const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const body=await req.json().catch(()=>null);
 const id=typeof body?.quizId==="string"?body.quizId:"";
 const reason=typeof body?.reason==="string"?body.reason.trim():"";
 if(!id||id.length>100||reason.length<10||reason.length>500)return NextResponse.json({error:"Vui lòng nhập lý do 10–500 ký tự"},{status:400});
 const db=getPrisma(),quiz=await db.quiz.findFirst({where:{id,visibility:"public",demo:false}});
 if(!quiz)return NextResponse.json({error:"Không tìm thấy Quiz công khai"},{status:404});
 if(quiz.ownerId===user.id)return NextResponse.json({error:"Không thể tự báo cáo Quiz của mình"},{status:400});
 await db.quizReport.upsert({where:{quizId_reporterId:{quizId:id,reporterId:user.id}},create:{id:crypto.randomUUID(),quizId:id,reporterId:user.id,reason},update:{reason}});
 return NextResponse.json({ok:true});
}
