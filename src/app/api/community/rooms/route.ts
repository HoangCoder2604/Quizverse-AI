import {NextRequest,NextResponse} from "next/server";
import {currentUser,allowMutation} from "@/lib/auth";
import {getPrisma} from "@/lib/prisma";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 if(!allowMutation(req))return NextResponse.json({error:"Invalid origin"},{status:403});
 const u=await currentUser();if(!u)return NextResponse.json({error:"Unauthorized"},{status:401});
 const body=await req.json().catch(()=>null);if(typeof body?.quizId!=="string")return NextResponse.json({error:"Chưa chọn Quiz"},{status:400});
 const secondsPerQuestion=body.secondsPerQuestion===undefined?30:body.secondsPerQuestion;
 const maxParticipants=body.maxParticipants===undefined?10:body.maxParticipants;
 if(!Number.isSafeInteger(secondsPerQuestion)||secondsPerQuestion<5||secondsPerQuestion>3600)
  return NextResponse.json({error:"Thời gian mỗi câu phải từ 5 đến 3600 giây"},{status:400});
 if(!Number.isSafeInteger(maxParticipants)||maxParticipants<2)
  return NextResponse.json({error:"Số người tối đa phải là số nguyên từ 2 trở lên"},{status:400});
 const db=getPrisma(),q=await db.quiz.findUnique({where:{id:body.quizId}});
 if(!q||q.demo||(q.ownerId!==u.id&&q.visibility==="private"))return NextResponse.json({error:"Quiz không khả dụng"},{status:404});
 for(let i=0;i<5;i++){
 const code=Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[v%32]).join("");
 try{const room=await db.quizRoom.create({data:{id:crypto.randomUUID(),code,quizId:q.id,hostId:u.id,secondsPerQuestion,maxParticipants,participants:{create:{id:crypto.randomUUID(),userId:u.id,displayName:u.name}}}});return NextResponse.json({code:room.code},{status:201});}catch{/* collision, retry */}
 }
 return NextResponse.json({error:"Không thể tạo phòng"},{status:500});
}
