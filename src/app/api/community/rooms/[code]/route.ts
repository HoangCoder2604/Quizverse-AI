import {NextRequest,NextResponse} from "next/server";
import {currentUser,allowMutation} from "@/lib/auth";
import {getPrisma} from "@/lib/prisma";
import {notifyRoom} from "@/lib/room-realtime";
export const runtime="nodejs";
type C={params:Promise<{code:string}>};
const err=(error:string,status:number)=>NextResponse.json({error},{status});
export async function GET(_:NextRequest,ctx:C){
 const user=await currentUser();if(!user)return err("Unauthorized",401);
 const code=(await ctx.params).code.toUpperCase(),db=getPrisma();
 const room=await db.quizRoom.findUnique({where:{code},include:{participants:true}});
 if(!room)return err("Không tìm thấy phòng",404);
 if(!room.participants.some(p=>p.userId===user.id))return err("Bạn chưa tham gia phòng",403);
 const q=await db.quiz.findUnique({where:{id:room.quizId}});if(!q)return err("Quiz không còn tồn tại",404);
 const questions=JSON.parse(q.questions) as {question:string;options:string[];correctIndex:number;explanation:string}[];
 const now=Date.now(),duration=questions.length*room.secondsPerQuestion*1000;
 const deadline=room.startedAt?room.startedAt.getTime()+duration:null;
 const finished=room.state==="finished"||(room.state==="playing"&&deadline!==null&&now>=deadline);
 const ownAnswers=await db.roomAnswer.findMany({where:{roomId:room.id,userId:user.id},select:{questionIndex:true,choiceIndex:true}});
 return NextResponse.json({code:room.code,title:q.title,secondsPerQuestion:room.secondsPerQuestion,maxParticipants:room.maxParticipants,host:room.hostId===user.id,state:finished?"finished":room.state,startedAt:room.startedAt?.toISOString()||null,deadline:deadline?new Date(deadline).toISOString():null,questions:questions.map((q,i)=>({index:i,question:finished||room.state==="playing"&&room.startedAt!==null&&i===Math.floor((now-room.startedAt.getTime())/(room.secondsPerQuestion*1000))?q.question:"Chờ đến lượt câu hỏi",options:finished||room.state==="playing"&&room.startedAt!==null&&i===Math.floor((now-room.startedAt.getTime())/(room.secondsPerQuestion*1000))?q.options:[],...(finished?{correctIndex:q.correctIndex,explanation:q.explanation}:{})})),participants:room.participants.map(x=>({name:x.displayName,score:x.score,finished:x.finished,self:x.userId===user.id})).sort((a,b)=>b.score-a.score),ownAnswers});
}
export async function POST(req:NextRequest,ctx:C){
 if(!allowMutation(req))return err("Invalid origin",403);
 const user=await currentUser();if(!user)return err("Unauthorized",401);
 const code=(await ctx.params).code.toUpperCase(),db=getPrisma(),body=await req.json().catch(()=>null);
 const room=await db.quizRoom.findUnique({where:{code},include:{participants:true}});if(!room)return err("Không tìm thấy phòng",404);
 const joined=room.participants.some(p=>p.userId===user.id);
 if(body?.action==="join"){
  if(room.state!=="lobby")return err("Phòng đã bắt đầu",409);
  if(joined)return NextResponse.json({ok:true});
  try {
   // Count and insert in the same SQLite write transaction: serialized on Turso.
   await db.$transaction(async tx=>{
    const live=await tx.quizRoom.findUnique({where:{id:room.id},include:{participants:true}});
    if(!live||live.state!=="lobby")throw new Error("Phòng đã bắt đầu");
    if(live.participants.some(p=>p.userId===user.id))return;
    if(live.participants.length>=live.maxParticipants)throw new Error("Phòng đã đủ người");
    await tx.roomParticipant.create({data:{id:crypto.randomUUID(),roomId:room.id,userId:user.id,displayName:user.name}});
   });
   await notifyRoom(code);
   return NextResponse.json({ok:true});
  }catch(e){return err(e instanceof Error&&e.message==="Phòng đã đủ người"?e.message:"Không tham gia được phòng (đã đủ hoặc vừa bắt đầu)",409)}
 }
 if(!joined)return err("Bạn chưa tham gia phòng",403);
 if(body?.action==="start"){
  if(room.hostId!==user.id)return err("Chỉ chủ phòng được bắt đầu",403);
  if(room.participants.length<2)return err("Cần ít nhất 2 người",409);
  const updated=await db.quizRoom.updateMany({where:{id:room.id,state:"lobby"},data:{state:"playing",startedAt:new Date()}});
  if(updated.count) await notifyRoom(code);
  return updated.count?NextResponse.json({ok:true}):err("Phòng đã bắt đầu",409);
 }
 if(body?.action==="answer"){
  if(room.state!=="playing"||!room.startedAt)return err("Phòng chưa bắt đầu",409);
  const q=await db.quiz.findUnique({where:{id:room.quizId}});if(!q)return err("Quiz unavailable",404);
  const questions=JSON.parse(q.questions) as {correctIndex:number;options:string[]}[];
  const idx=body.questionIndex, choice=body.choiceIndex;
  if(!Number.isInteger(idx)||idx<0||idx>=questions.length||!Number.isInteger(choice)||choice<0||choice>=questions[idx].options.length)return err("Đáp án không hợp lệ",400);
  const elapsed=Date.now()-room.startedAt.getTime();
  if(elapsed<idx*room.secondsPerQuestion*1000||elapsed>=(idx+1)*room.secondsPerQuestion*1000)return err("Đã hết thời gian của câu hỏi",409);
  const correct=questions[idx].correctIndex===choice;
  try{
   await db.$transaction(async tx=>{
    await tx.roomAnswer.create({data:{id:crypto.randomUUID(),roomId:room.id,userId:user.id,questionIndex:idx,choiceIndex:choice,correct}});
    if(correct)await tx.roomParticipant.update({where:{roomId_userId:{roomId:room.id,userId:user.id}},data:{score:{increment:100}}});
   });
   await notifyRoom(code);
   return NextResponse.json({ok:true});
  }catch{return err("Bạn đã trả lời câu này",409)}
 }
 if(body?.action==="finish"){
  if(!room.startedAt||room.state==="lobby")return err("Phòng chưa bắt đầu",409);
  const q=await db.quiz.findUnique({where:{id:room.quizId}});if(!q)return err("Quiz unavailable",404);
  const duration=(JSON.parse(q.questions) as unknown[]).length*room.secondsPerQuestion*1000;
  if(Date.now()<room.startedAt.getTime()+duration)return err("Chưa hết thời gian thi",409);
  const own=await db.roomParticipant.findUnique({where:{roomId_userId:{roomId:room.id,userId:user.id}}});
  if(!own)return err("Không thuộc phòng",403);
  // Claim completion and grant reward in ONE transaction. A failure rolls back both.
  const xp=20+Math.floor(own.score/100)*10;
  try {
   const awarded=await db.$transaction(async tx=>{
    const claim=await tx.roomParticipant.updateMany({where:{id:own.id,finished:false},data:{finished:true}});
    if(!claim.count)return false;
    const old=await tx.playerProfile.findUnique({where:{userId:user.id}});
    const next=(old?.xp||0)+xp;
    await tx.playerProfile.upsert({where:{userId:user.id},create:{userId:user.id,xp:next,level:Math.floor(Math.sqrt(next/100))+1,games:1},update:{xp:next,level:Math.floor(Math.sqrt(next/100))+1,games:{increment:1}}});
    if(next>=100)await tx.playerAchievement.upsert({where:{userId_code:{userId:user.id,code:"first_100_xp"}},create:{id:crypto.randomUUID(),userId:user.id,code:"first_100_xp"},update:{}});
    await tx.playerAchievement.upsert({where:{userId_code:{userId:user.id,code:"first_room"}},create:{id:crypto.randomUUID(),userId:user.id,code:"first_room"},update:{}});
    return true;
   });
   if(awarded) await notifyRoom(code);
   return NextResponse.json({ok:true,xpEarned:awarded?xp:0});
  }catch(e){console.error("room reward transaction",e);return err("Không lưu được phần thưởng, hãy thử lại",503)}
 }
 return err("Action không hợp lệ",400);
}
