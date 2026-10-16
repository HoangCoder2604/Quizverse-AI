import { NextRequest, NextResponse } from "next/server";
import { currentUser, allowMutation } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
export const runtime="nodejs";
function normal(s:string){return s.trim().replace(/\s+/g," ").toLocaleLowerCase("vi");}
function key(c:{topic:string;question:string;options:string;correctIndex:number}){
  return JSON.stringify([normal(c.topic),normal(c.question),
    (JSON.parse(c.options) as string[]).map(normal),c.correctIndex]);
}
export async function POST(req:NextRequest){
  if(!allowMutation(req))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const input=await req.json().catch(()=>null) as {cardIds?:unknown;answers?:unknown}|null;
  if(!input||!Array.isArray(input.cardIds)||!Array.isArray(input.answers)||input.cardIds.length<1||
    input.cardIds.length>10||input.cardIds.length!==input.answers.length||
    !input.cardIds.every(v=>typeof v==="string")||
    new Set(input.cardIds).size!==input.cardIds.length||
    !input.answers.every(v=>Number.isInteger(v)&&v>=-1&&v<=3))
    return NextResponse.json({error:"Dữ liệu ôn tập không hợp lệ"},{status:400});
  const ids=input.cardIds as string[],answers=input.answers as number[];
  const db=getPrisma(),now=new Date();
  try{
    const result=await db.$transaction(async tx=>{
      const cards=await tx.reviewCard.findMany({where:{ownerId:user.id}});
      const selected=ids.map(id=>cards.find(c=>c.id===id));
      if(selected.some(c=>!c))throw new Error("Không tìm thấy câu ôn tập");
      // A card may only be reviewed while due. Resubmitting a completed review must not reschedule it.
      if(selected.some(c=>!c||c.nextReview>now))throw new Error("Câu hỏi chưa đến hạn hoặc đã được ôn");
      let correct=0;
      for(let i=0;i<selected.length;i++){
        const card=selected[i]!;
        const ok=answers[i]===card.correctIndex;
        if(ok)correct++;
        const group=cards.filter(c=>key(c)===key(card));
        const repetitions=ok?card.repetitions+1:0;
        const intervalDays=ok?Math.min(30,Math.max(1,card.intervalDays*2)):1;
        // Wrong answers are scheduled soon, not immediately retried as a new quiz.
        const nextReview=new Date(now.getTime()+(ok?intervalDays*86400000:10*60000));
        for(const c of group)await tx.reviewCard.update({where:{id:c.id},data:{repetitions,intervalDays,nextReview,updatedAt:now}});
      }
      return {ok:true,correct,total:ids.length};
    });
    return NextResponse.json(result);
  }catch(e){console.error("learning review",e);
    return NextResponse.json({error:e instanceof Error?e.message:"Không cập nhật được lịch ôn"},{status:409});}
}
