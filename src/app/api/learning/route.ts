import { NextRequest, NextResponse } from "next/server";
import { currentUser, allowMutation } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import type { Question } from "@/lib/types";
export const runtime = "nodejs";

function normalized(topic: string) { return topic.trim().replace(/\s+/g, " ").slice(0, 500); }
function recommended(strength: number): "easy" | "medium" | "hard" {
  return strength >= 0.8 ? "hard" : strength >= 0.5 ? "medium" : "easy";
}
// Same owner/topic/question/options/correct answer across different Quiz IDs = one review item.
// Keep separate cards when an option or the correct answer differs.
function canonical(s:string){return s.trim().replace(/\s+/g," ").toLocaleLowerCase("vi");}
function identity(c:{topic:string;question:string;options:string;correctIndex:number}){
  let options:unknown;
  try{options=JSON.parse(c.options);}catch{options=c.options;}
  return JSON.stringify([canonical(c.topic),canonical(c.question),
    Array.isArray(options)?options.map(x=>canonical(String(x))):options,c.correctIndex]);
}
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({error:"Unauthorized"},{status:401});
  try {
    const db=getPrisma(), now=new Date();
    const [topics,cards]=await Promise.all([
      db.topicMastery.findMany({where:{ownerId:user.id},orderBy:{updatedAt:"desc"},take:100}),
      db.reviewCard.findMany({where:{ownerId:user.id,nextReview:{lte:now}},orderBy:{nextReview:"asc"}})
    ]);
    // Deduplicate legacy cards for display and counts; no historical data is deleted.
    const unique=[...new Map(cards.map(c=>[identity(c),c])).values()];
    const groupCounts=new Map<string,number>();
    for(const c of unique)groupCounts.set(c.topic,(groupCounts.get(c.topic)||0)+1);
    return NextResponse.json({
      topics:topics.map(t=>({topic:t.topic,answered:t.answered,correct:t.correct,strength:t.strength,streak:t.streak,
        recommendedDifficulty:recommended(t.strength),nextReview:t.nextReview.toISOString()})),
      due:unique.map(c=>({id:c.id,topic:c.topic,question:c.question,options:JSON.parse(c.options),correctIndex:c.correctIndex,explanation:c.explanation,nextReview:c.nextReview.toISOString()})),
      dueCount:unique.length,dueByTopic:[...groupCounts].sort((a,b)=>a[0].localeCompare(b[0])).map(([topic,count])=>({topic,count}))
    });
  }catch(err){console.error("learning GET",err);return NextResponse.json({error:"Không đọc được dữ liệu học tập. Kiểm tra migration Phase 5."},{status:500});}
}

export async function POST(req:NextRequest){
  if(!allowMutation(req))return NextResponse.json({error:"Invalid origin"},{status:403});
  const user=await currentUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
  const input=await req.json().catch(()=>null) as {attemptId?:unknown;answers?:unknown}|null;
  if(!input||typeof input.attemptId!=="string"||!Array.isArray(input.answers)||input.answers.length>50||
    !input.answers.every(x=>Number.isInteger(x)&&x>=-1&&x<=3))return NextResponse.json({error:"Dữ liệu kết quả không hợp lệ"},{status:400});
  const answers=input.answers as number[];
  const db=getPrisma();
  try{
    const attempt=await db.attempt.findFirst({where:{id:input.attemptId,ownerId:user.id},include:{quiz:true}});
    if(!attempt)return NextResponse.json({error:"Không tìm thấy bài làm"},{status:404});
    const questions:Question[]=JSON.parse(attempt.quiz.questions);
    if(questions.length!==answers.length||questions.length!==attempt.total)return NextResponse.json({error:"Số câu không khớp"},{status:400});
    const result=questions.reduce((n,q,i)=>n+(q.correctIndex===answers[i]?1:0),0);
    if(result!==attempt.score)return NextResponse.json({error:"Đáp án không khớp kết quả đã lưu"},{status:400});
    const topic=normalized(attempt.quiz.topic),now=new Date(), passed=result/Math.max(1,questions.length);
    await db.$transaction(async tx=>{
      // Unique attemptId makes retries idempotent. All updates commit or roll back together.
      await tx.learningSubmission.create({data:{attemptId:attempt.id,ownerId:user.id}});
      const current=await tx.topicMastery.findUnique({where:{ownerId_topic:{ownerId:user.id,topic}}});
      const total=(current?.answered||0)+questions.length;
      const correct=(current?.correct||0)+result;
      const strength=Math.max(0,Math.min(1,(current ? current.strength*0.65+passed*0.35 : passed)));
      const streak=passed>=0.8?(current?.streak||0)+1:0;
      const days=passed>=0.8?Math.min(30,Math.pow(2,Math.min(streak,4))):1;
      const nextReview=new Date(now.getTime()+days*86400000);
      await tx.topicMastery.upsert({where:{ownerId_topic:{ownerId:user.id,topic}},create:{id:crypto.randomUUID(),ownerId:user.id,topic,answered:total,correct,strength,streak,nextReview,updatedAt:now},update:{answered:total,correct,strength,streak,nextReview,updatedAt:now}});
      // Read existing review cards once per topic, then match by content, not Quiz ID.
      const known=await tx.reviewCard.findMany({where:{ownerId:user.id,topic}});
      for(let i=0;i<questions.length;i++){
        const q=questions[i], correctAnswer=answers[i]===q.correctIndex;
        const match=identity({topic,question:q.question,options:JSON.stringify(q.options),correctIndex:q.correctIndex});
        const equivalents=known.filter(c=>identity(c)===match);
        if(correctAnswer && !equivalents.length)continue;
        const existing=equivalents[0];
        const repetitions=correctAnswer?(existing?.repetitions||0)+1:0;
        const intervalDays=correctAnswer?Math.min(30,Math.max(1,(existing?.intervalDays||1)*2)):1;
        const due=new Date(now.getTime()+(correctAnswer?intervalDays*86400000:0));
        if(equivalents.length){
          for(const card of equivalents)await tx.reviewCard.update({where:{id:card.id},data:{
            repetitions,intervalDays,nextReview:due,updatedAt:now
          }});
        }else{
          const id=`${user.id}:${attempt.quizId}:${q.id}`;
          const created=await tx.reviewCard.create({data:{id,ownerId:user.id,topic,
            question:q.question,options:JSON.stringify(q.options),correctIndex:q.correctIndex,
            explanation:q.explanation,intervalDays,repetitions,nextReview:due,updatedAt:now}});
          known.push(created);
        }
      }
    });
    return NextResponse.json({ok:true});
  }catch(err){
    // A repeated submission should not alter mastery twice.
    if(err&&typeof err==="object"&&"code" in err&&err.code==="P2002")return NextResponse.json({ok:true,alreadyRecorded:true});
    console.error("learning POST",err);return NextResponse.json({error:"Không cập nhật được tiến độ học tập"},{status:500});
  }
}
