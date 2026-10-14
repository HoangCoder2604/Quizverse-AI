"use client";
import { useEffect,useMemo,useRef,useState } from "react";
import { Sparkles,Search,ShieldCheck,CalendarDays,Target,LayoutDashboard,Compass,BookOpen,ChartNoAxesCombined,Settings2,BrainCircuit,ArrowRight,ArrowLeft,Clock3,CheckCircle2,XCircle,RotateCcw,PanelLeftClose,GraduationCap,Gamepad2,Atom,Code2,Trophy,Menu,Library,Check,AlertCircle,Lightbulb,LoaderCircle,Square, Pencil,Trash2 } from "lucide-react";
import type { Quiz,Attempt,Difficulty } from "@/lib/types";
import MathText from "@/components/MathText";
import {demoCategories,makeDemoQuiz} from "@/lib/demo";
import { isValidEmail } from "@/lib/email";
import { firebaseAuth } from "@/lib/firebase-client";
import { createUserWithEmailAndPassword,sendEmailVerification,signInWithEmailAndPassword,signInWithPopup,GoogleAuthProvider,updateProfile,signOut } from "firebase/auth";

type Screen = "dashboard"|"create"|"review"|"quiz"|"results"|"library"|"analytics"|"learning";
type TopicStats = {topic:string;answered:number;correct:number;strength:number;streak:number;recommendedDifficulty:Difficulty;nextReview:string};
type DueCard = {id:string;topic:string;question:string;options:string[];correctIndex:number;explanation:string;nextReview:string};

// Local similarity warning only: this cannot establish factual correctness.
function normalizedWords(value:string):string[]{return value.toLocaleLowerCase("vi").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(w=>w.length>2)}
function similarity(a:string,b:string):number{
 const x=new Set(normalizedWords(a)),y=new Set(normalizedWords(b));
 if(!x.size||!y.size)return 0;
 const intersection=[...x].filter(w=>y.has(w)).length;
 return intersection/(x.size+y.size-intersection);
}
function reviewWarnings(quiz:Quiz):string[]{
 const result:string[]=[];
 quiz.questions.forEach((q,i)=>{
  if(!q.question.trim()||q.options.length!==4||q.options.some(x=>!x.trim())||!q.explanation.trim()||!Number.isInteger(q.correctIndex)||q.correctIndex<0||q.correctIndex>3)result.push(`Câu ${i+1}: Thiếu nội dung, giải thích hoặc đáp án hợp lệ.`);
  if(new Set(q.options.map(x=>x.trim().toLocaleLowerCase("vi"))).size!==4)result.push(`Câu ${i+1}: Có lựa chọn trùng nhau.`);
  for(let j=0;j<i;j++)if(similarity(q.question,quiz.questions[j].question)>=0.78)result.push(`Câu ${i+1} và ${j+1} có nội dung gần giống nhau (cần xem lại).`);
 });
 return result;
}
const samples=[{name:"Unity Game Development",icon:Gamepad2,tag:"Lập trình",category:"unity"},{name:"Đại số & Giải tích",icon:GraduationCap,tag:"Toán học",category:"math"},{name:"Lịch sử thế giới",icon:BookOpen,tag:"Kiến thức",category:"history"},{name:"Khoa học tổng hợp",icon:Atom,tag:"Khoa học",category:"science"}];
function readStored<T>(key:string):T[] {try {const data=JSON.parse(localStorage.getItem(key)||"[]");return Array.isArray(data)?data:[]}catch{return []}}
export default function Home(){
 const [user,setUser]=useState<{id:string;name:string;email:string}|null>(null);
 const [authReady,setAuthReady]=useState(false),[authMode,setAuthMode]=useState<"login"|"register">("login"),[authEmail,setAuthEmail]=useState(""),[authPassword,setAuthPassword]=useState(""),[authName,setAuthName]=useState(""),[authBusy,setAuthBusy]=useState(false),[authError,setAuthError]=useState("");
 const [authNotice,setAuthNotice]=useState("");
 const [screen,setScreen]=useState<Screen>("dashboard"),[sideOpen,setSideOpen]=useState(false);
 const [topic,setTopic]=useState(""),[count,setCount]=useState(10),[difficulty,setDifficulty]=useState<Difficulty>("medium");
 const [sourceMode,setSourceMode]=useState<"topic"|"text"|"file"|"url">("topic");
 const [sourceText,setSourceText]=useState("");
 const [sourceFile,setSourceFile]=useState<File|null>(null);
 const [sourceUrl,setSourceUrl]=useState("");
 const [extractionInfo,setExtractionInfo]=useState("");
 const [quizzes,setQuizzes]=useState<Quiz[]>([]),[attempts,setAttempts]=useState<Attempt[]>([]),[ready,setReady]=useState(false);
 const [current,setCurrent]=useState<Quiz|null>(null),[index,setIndex]=useState(0),[answers,setAnswers]=useState<Record<number,number>>({});
 const [draftQuiz,setDraftQuiz]=useState<Quiz|null>(null),[savingReview,setSavingReview]=useState(false),[reviewError,setReviewError]=useState("");
 const [editingId,setEditingId]=useState<string|null>(null);
 const [libraryBusy,setLibraryBusy]=useState<string|null>(null);
 const [timeLeft,setTimeLeft]=useState(0);
 const [mastery,setMastery]=useState<TopicStats[]>([]);
 const [reviewDue,setReviewDue]=useState<DueCard[]>([]);
 const [learningBusy,setLearningBusy]=useState(false);
 const [tutorId,setTutorId]=useState<string|null>(null);
 const [tutorQuestion,setTutorQuestion]=useState("");
 const [tutorResponse,setTutorResponse]=useState("");
 const [tutorBusy,setTutorBusy]=useState(false);
 const [loading,setLoading]=useState(false),[error,setError]=useState(""),[finished,setFinished]=useState<Attempt|null>(null);
 const [generationStep,setGenerationStep]=useState<"extract"|"generate"|"save">("generate");
 const [generationSeconds,setGenerationSeconds]=useState(0);
 const [documentProgress,setDocumentProgress]=useState<{done:number;total:number}|null>(null);
 const [questionProgress,setQuestionProgress]=useState<{done:number;total:number}|null>(null);
 const quizDeadline=useRef(0);
 const generationAbort=useRef<AbortController|null>(null);
 const generationRun=useRef(0);
 useEffect(()=>{
  if(!loading)return;
  const interval=setInterval(()=>setGenerationSeconds(v=>v+1),1000);
  return ()=>clearInterval(interval);
 },[loading]);
 const [storage,setStorage]=useState<"checking"|"turso"|"local">("checking"),[storageError,setStorageError]=useState("");
 useEffect(()=>{
  let active=true;
  async function load(){
   try {
    const response=await fetch("/api/auth",{cache:"no-store"});
    const result=await response.json();
    if(!active)return;
    if(!response.ok) {setAuthError(result.error||"Không thể kiểm tra phiên");return;}
    setUser(result.user);
    if(result.user) await loadData(active);
   }catch{if(active)setAuthError("Không thể kết nối tới máy chủ");}
   finally{if(active)setAuthReady(true);}
  }
  void load();return ()=>{active=false};
 },[]);
 async function loadData(active=true){
  const [qr,ar]=await Promise.all([fetch("/api/quizzes",{cache:"no-store"}),fetch("/api/attempts",{cache:"no-store"})]);
  if(!qr.ok||!ar.ok) {setStorageError("Không đọc được dữ liệu Turso. Vui lòng thử lại.");return;}
  const [qd,ad]=await Promise.all([qr.json(),ar.json()]);
  if(active){setQuizzes(qd.quizzes);setAttempts(ad.attempts);setStorage("turso");setReady(true);setStorageError("");}
  void refreshLearning();
 }
 async function refreshLearning(){
  try{const r=await fetch("/api/learning",{cache:"no-store"});if(!r.ok)return;
    const data=await r.json();setMastery(data.topics||[]);setReviewDue(data.due||[]);
  }catch{/* Existing Quiz flows remain usable if learning metrics are unavailable. */}
 }
 function recommendedQuiz(t:TopicStats){
  setTopic(t.topic);setDifficulty(t.recommendedDifficulty);setCount(10);setSourceMode("topic");go("create");
 }
 function practiceDue(){
  if(!reviewDue.length)return;
  const selected=reviewDue.slice(0,Math.min(10,reviewDue.length));
  const quiz:Quiz={id:crypto.randomUUID(),title:"Ôn tập thông minh",topic:selected[0].topic,difficulty:"medium",demo:true,
    questions:selected.map(c=>({id:crypto.randomUUID(),question:c.question,options:c.options,correctIndex:c.correctIndex,explanation:c.explanation})),createdAt:new Date().toISOString()};
  start(quiz);
 }
 async function askTutor(card:DueCard){
  if(!tutorQuestion.trim()||tutorBusy)return;
  setTutorBusy(true);setTutorResponse("");
  try{const r=await fetch("/api/tutor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cardId:card.id,question:tutorQuestion.trim()})});
    const data=await r.json();if(!r.ok)throw new Error(data.error||"Gia sư chưa phản hồi");setTutorResponse(data.answer);
  }catch(e){setTutorResponse(e instanceof Error?e.message:"Không nhận được câu trả lời");}
  finally{setTutorBusy(false)}
 }
 function resetAuthForm(){setAuthEmail("");setAuthPassword("");setAuthName("");setAuthError("");setAuthNotice("");}
 async function authenticate(event:React.FormEvent){
  event.preventDefault();
  if(!isValidEmail(authEmail)){setAuthError("Email không đúng định dạng. Ví dụ: ten@gmail.com");return;}
  setAuthBusy(true);setAuthError("");setAuthNotice("");
  try {
   const auth=firebaseAuth();
   if(authMode==="register") {
    if(authPassword.length<10)throw new Error("Mật khẩu cần ít nhất 10 ký tự.");
    const cred=await createUserWithEmailAndPassword(auth,authEmail.trim(),authPassword);
    if(authName.trim())await updateProfile(cred.user,{displayName:authName.trim()});
    await sendEmailVerification(cred.user);
    await signOut(auth);
    setAuthNotice("Firebase đã gửi link xác minh. Mở email và xác minh trước khi đăng nhập.");
    setAuthPassword("");setAuthMode("login");return;
   }
   const cred=await signInWithEmailAndPassword(auth,authEmail.trim(),authPassword);
   await cred.user.reload();
   if(!cred.user.emailVerified){await signOut(auth);throw new Error("Email chưa được xác minh. Hãy mở link trong hộp thư rồi đăng nhập lại.");}
   const idToken=await cred.user.getIdToken(true);
   const res=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"session",idToken})});
   const data=await res.json();if(!res.ok)throw new Error(data.error||"Không thể tạo phiên đăng nhập");
   await signOut(auth); // Server HttpOnly session cookie manages authentication after this point.
   setUser(data.user);resetAuthForm();await loadData();
  }catch(e){
   const code=(e as {code?:string})?.code||"";
   const messages:Record<string,string>={"auth/email-already-in-use":"Email đã được đăng ký. Vui lòng đăng nhập.","auth/invalid-email":"Email không hợp lệ.","auth/invalid-credential":"Email hoặc mật khẩu không đúng.","auth/weak-password":"Mật khẩu quá yếu.","auth/too-many-requests":"Thao tác quá nhiều lần. Vui lòng thử lại sau.","auth/network-request-failed":"Không thể kết nối Firebase."};
   setAuthError(messages[code]||(e instanceof Error?e.message:"Có lỗi xảy ra"));
  }finally{setAuthBusy(false);}
 }
 async function googleSignIn(){
  setAuthBusy(true);setAuthError("");setAuthNotice("");
  try {
   const auth=firebaseAuth();
   const provider=new GoogleAuthProvider();
   provider.setCustomParameters({prompt:"select_account"});
   const credential=await signInWithPopup(auth,provider);
   await credential.user.reload();
   if(!credential.user.emailVerified)throw new Error("Google chưa xác nhận email này. Vui lòng sử dụng tài khoản Google có email đã xác minh.");
   const idToken=await credential.user.getIdToken(true);
   const response=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"session",idToken})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Không thể đăng nhập bằng Google");
   setUser(result.user);resetAuthForm();await loadData();
  }catch(e){
   const code=(e as {code?:string})?.code||"";
   const messages:Record<string,string>={
    "auth/popup-closed-by-user":"Bạn đã đóng cửa sổ đăng nhập Google.",
    "auth/cancelled-popup-request":"Yêu cầu đăng nhập Google đã bị hủy.",
    "auth/popup-blocked":"Trình duyệt đã chặn cửa sổ Google. Hãy cho phép popup rồi thử lại.",
    "auth/unauthorized-domain":"Domain này chưa được thêm vào Firebase Authentication → Settings → Authorized domains.",
    "auth/operation-not-allowed":"Chưa bật nhà cung cấp Google trong Firebase → Authentication → Sign-in method.",
    "auth/account-exists-with-different-credential":"Email này đã có tài khoản với phương thức đăng nhập khác. Hãy đăng nhập bằng phương thức cũ trước để liên kết Google.",
    "auth/network-request-failed":"Không thể kết nối tới Firebase."
   };
   setAuthError(messages[code]||(e instanceof Error?e.message:"Đăng nhập Google thất bại"));
  }finally{
   // Firebase client state is only used to obtain an ID token; the backend owns session cookies.
   await signOut(firebaseAuth()).catch(()=>{});
   setAuthBusy(false);
  }
 }
 async function resendVerification(){
  if(!isValidEmail(authEmail)||!authPassword){setAuthError("Nhập email và mật khẩu đúng để gửi lại link xác minh.");return;}
  setAuthBusy(true);setAuthError("");setAuthNotice("");
  try {
   const auth=firebaseAuth();const cred=await signInWithEmailAndPassword(auth,authEmail.trim(),authPassword);
   await cred.user.reload();
   if(cred.user.emailVerified){setAuthNotice("Email đã được xác minh. Bạn có thể đăng nhập.");}
   else {await sendEmailVerification(cred.user);setAuthNotice("Nếu chưa nhận được, hãy kiểm tra Spam và đợi vài phút trước khi gửi lại.");}
   await signOut(auth);
  }catch(e){setAuthError(e instanceof Error?e.message:"Không thể gửi lại email");}finally{setAuthBusy(false);}
 }
 async function logout(){
  await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout"})});
  setUser(null);setQuizzes([]);setAttempts([]);setMastery([]);setReviewDue([]);setStorage("checking");setReady(false);setScreen("dashboard");resetAuthForm();setAuthMode("login");
 }
 async function persist(endpoint:"quizzes"|"attempts", key:"quiz"|"attempt", item:Quiz|Attempt){
  const res=await fetch(`/api/${endpoint}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({[key]:item})});
  if(!res.ok){const body=await res.json().catch(()=>({}));throw new Error(body.error||"Không lưu được dữ liệu");}
 }
 const best=useMemo(()=>attempts.length?Math.round(attempts.reduce((s,a)=>s+a.score/a.total*100,0)/attempts.length):0,[attempts]);
 const navigation=[{id:"dashboard" as Screen,label:"Tổng quan",icon:LayoutDashboard},{id:"create" as Screen,label:"Tạo bài luyện tập",icon:Sparkles},{id:"library" as Screen,label:"Bộ sưu tập",icon:Library},{id:"analytics" as Screen,label:"Thống kê",icon:ChartNoAxesCombined},{id:"learning" as Screen,label:"Học tập thích ứng",icon:BrainCircuit}];
 function go(next:Screen){setScreen(next);setError("");setSideOpen(false)}
 function start(quiz:Quiz){setCurrent(quiz);setIndex(0);setAnswers({});setFinished(null);quizDeadline.current=Date.now()+quiz.questions.length*60000;setTimeLeft(quiz.questions.length*60);go("quiz")}
 function startDemo(category:string){const quiz=makeDemoQuiz(category,5,difficulty);start(quiz)}
 // Mỗi ký tự nguồn được đưa vào đúng một chunk, không bỏ phần giữa tài liệu.
 function splitAllText(raw: string, chunkSize = 34000): string[] {
  const parts: string[] = [];
  let position = 0;
  while (position < raw.length) {
   const endLimit = Math.min(raw.length, position + chunkSize);
   let end = endLimit;
   if (endLimit < raw.length) {
    const lastParagraph = raw.lastIndexOf("\n", endLimit);
    if (lastParagraph > position + chunkSize * 0.6) end = lastParagraph + 1;
   }
   const part = raw.slice(position, end).trim();
   if (part) parts.push(part);
   position = end;
  }
  return parts;
 }
 async function createEvidenceMap(text: string, controller: AbortController, isCurrent: () => boolean): Promise<string> {
  const chunks = splitAllText(text);
  if (chunks.length > 100) throw new Error("Tài liệu vượt giới hạn 100 phần xử lý. Hãy chia thành những file nhỏ hơn.");
  setDocumentProgress({done:0,total:chunks.length});
  const outlines = new Array<string>(chunks.length);
  let cursor = 0;
  let done = 0;
  // Concurrency 2: hạn chế tiêu hao quota Free Tier và vẫn có tiến độ thật.
  async function worker() {
   while (cursor < chunks.length) {
    const i = cursor++;
    let success = false;
    for (let retry = 0; retry < 2 && !success; retry++) {
     const res = await fetch("/api/source-analyze", {
      method:"POST", signal:controller.signal, headers:{"Content-Type":"application/json"},
      body:JSON.stringify({text:chunks[i],index:i+1,total:chunks.length})
     });
     const data = await res.json();
     if (!isCurrent()) throw new Error("Đã hủy yêu cầu.");
     if (res.ok && typeof data.outline === "string") { outlines[i] = data.outline; success = true; }
     else if (retry === 1 || res.status === 429) throw new Error(`Không phân tích được phần ${i+1}/${chunks.length}: ${data.error || "Lỗi không xác định"}`);
    }
    done++;
    if(isCurrent())setDocumentProgress({done,total:chunks.length});
   }
  }
  await Promise.all(Array.from({length:Math.min(2,chunks.length)},()=>worker()));
  const evidence = outlines.map((outline,i)=>`[Phần ${i+1}/${chunks.length}]\n${outline}`).join("\n\n");
  if(evidence.length > 45000)throw new Error("Bản tổng hợp vượt giới hạn xử lý. Hãy chia tài liệu thành những phần nhỏ hơn.");
  return evidence;
 }
 function cancelGeneration(){
  // Hủy request phía trình duyệt. Request đã đến Gemini có thể vẫn tiêu thụ quota.
  generationRun.current+=1;
  generationAbort.current?.abort();
  generationAbort.current=null;
  setLoading(false);
  setGenerationSeconds(0);setDocumentProgress(null);setQuestionProgress(null);
  setError("Đã hủy yêu cầu trên thiết bị. Tác vụ đã gửi đến hệ thống có thể vẫn đang được xử lý.");
 }
 async function generate(){
  if(loading)return;
  if(sourceMode==="topic"&&!topic.trim()){setError("Vui lòng nhập chủ đề trước khi tạo bộ câu hỏi.");return;}
  if(sourceMode==="text" && sourceText.trim().length<100){setError("Vui lòng dán văn bản tối thiểu 100 ký tự.");return;}
  const controller=new AbortController();
  generationAbort.current=controller;
  const run=++generationRun.current;
  const isCurrent=()=>generationRun.current===run && !controller.signal.aborted;
  setLoading(true);setGenerationSeconds(0);setDocumentProgress(null);setQuestionProgress(null);setQuestionProgress(null);setError("");setExtractionInfo("");
  setGenerationStep(sourceMode==="file"||sourceMode==="url"?"extract":"generate");
  try{
   let extracted=sourceMode==="text"?sourceText.trim():"";
   if(sourceMode==="file"||sourceMode==="url"){
    if(sourceMode==="file"&&!sourceFile)throw new Error("Vui lòng chọn file PDF, DOCX hoặc TXT.");
    if(sourceMode==="file"&&sourceFile && sourceFile.size>20*1024*1024)throw new Error("File vượt quá giới hạn 20 MB.");
    if(sourceMode==="url"&&!sourceUrl.trim())throw new Error("Vui lòng nhập URL HTTPS.");
    const form=new FormData();
    if(sourceMode==="file"&&sourceFile)form.set("file",sourceFile);
    else form.set("url",sourceUrl.trim());
    const extraction=await fetch("/api/source-extract",{method:"POST",body:form,signal:controller.signal});
    const result=await extraction.json();
    if(!isCurrent())return;
    if(!extraction.ok)throw new Error(result.error||"Không đọc được tài liệu.");
    extracted=result.text;
    setExtractionInfo(`Đã trích xuất toàn văn ${Number(result.characters).toLocaleString("vi-VN")} ký tự từ ${result.filename}.`);
   }
   if(sourceMode!=="topic"&&(extracted.length<100||extracted.length>2000000))throw new Error("Văn bản phải có từ 100 đến 2.000.000 ký tự.");
   // Toàn bộ nguồn được đọc qua từng chunk; bản tổng hợp bảo toàn thứ tự vị trí.
   if (sourceMode!=="topic" && extracted.length>45000) {
    setGenerationStep("extract");
    extracted = await createEvidenceMap(extracted,controller,isCurrent);
    if (!isCurrent()) return;
    setExtractionInfo(v=>`${v} Đã phân tích các phần từ đầu đến cuối và tổng hợp ý chính để tạo Quiz.`);
   }
   if(!isCurrent())return;
   const resolvedTopic=topic.trim() || (sourceMode==="text"?"Đọc hiểu văn bản":sourceMode==="file"?(sourceFile?.name.replace(/\.[^.]+$/, "") || "Tài liệu học tập"):"Nội dung bài viết");
   setGenerationStep("generate");
   // Generate short batches to avoid malformed/truncated JSON. Each validated batch is counted only after success.
   const generated:Quiz["questions"]=[];
   const batches=Math.ceil(count/5);
   let quizTitle="";
   setQuestionProgress({done:0,total:count});
   for(let batch=0;batch<batches;batch++){
    const batchCount=Math.min(5,count-generated.length);
    let chunk:Quiz|null=null;
    let lastBatchError="";
    // Retry only the failed batch; never discard batches already completed.
    for(let attempt=0;attempt<2 && !chunk;attempt++){
     const response=await fetch("/api/generate",{
      method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,
      body:JSON.stringify({
       topic:resolvedTopic,count:batchCount,difficulty,
       mode:sourceMode==="topic"?"topic":"source",sourceText:extracted,
       batchIndex:batch,batchTotal:batches,
       previousQuestions:generated.map(q=>q.question)
      })
     });
     const batchData=await response.json();
     if(!isCurrent())return;
     if(!response.ok){
      lastBatchError=batchData.error||"Lỗi không xác định";
      if(response.status===429 || response.status===400 || response.status===401 || response.status===403)break;
      continue;
     }
     const candidate=batchData.quiz as Quiz;
     if(!Array.isArray(candidate?.questions)||candidate.questions.length!==batchCount){
      lastBatchError="Nhóm câu hỏi trả về chưa đủ số lượng.";continue;
     }
     const normalized=(s:string)=>s.trim().toLocaleLowerCase("vi").replace(/\s+/g," ");
     const seen=new Set(generated.map(q=>normalized(q.question)));
     if(candidate.questions.some(q=>seen.has(normalized(q.question)))){
      lastBatchError="Nhóm có câu hỏi trùng với nhóm trước.";continue;
     }
     chunk=candidate;
    }
    if(!chunk)throw new Error(`Không tạo được nhóm câu ${batch+1}/${batches}: ${lastBatchError}`);
    if(!quizTitle)quizTitle=chunk.title;
    generated.push(...chunk.questions);
    setQuestionProgress({done:generated.length,total:count});
   }
   if(generated.length!==count)throw new Error("Bộ câu hỏi chưa đủ số lượng.");
   const completedQuiz:Quiz={id:crypto.randomUUID(),topic:resolvedTopic,title:quizTitle||`Quiz: ${resolvedTopic}`,difficulty,questions:generated,createdAt:new Date().toISOString()};
   if(!isCurrent())return;
   setEditingId(null);setDraftQuiz(completedQuiz);setReviewError("");setLoading(false);generationAbort.current=null;go("review");
  }catch(e){
   if(isCurrent())setError(e instanceof Error?e.message:"Có lỗi xảy ra.");
  }finally{
   if(generationRun.current===run){setLoading(false);generationAbort.current=null;}
  }
 }
 function editDraftQuestion(i:number, update:Partial<Quiz["questions"][number]>){
  setDraftQuiz(old=>old?{...old,questions:old.questions.map((q,j)=>j===i?{...q,...update}:q)}:old);
  setReviewError("");
 }
 async function confirmDraft(){
  if(!draftQuiz||savingReview)return;
  const issues=reviewWarnings(draftQuiz);
  if(issues.length){setReviewError("Vui lòng xử lý cảnh báo trước khi lưu: "+issues[0]);return;}
  setSavingReview(true);setReviewError("");
  try{
   if(editingId){
    const response=await fetch(`/api/quizzes/${encodeURIComponent(editingId)}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({quiz:draftQuiz})});
    if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||"Không cập nhật được Quiz");}
    setQuizzes(items=>items.map(item=>item.id===editingId?draftQuiz:item));
    setDraftQuiz(null);setEditingId(null);go("library");
   }else{
    await persist("quizzes","quiz",draftQuiz);
    setQuizzes(q=>[draftQuiz,...q]);setDraftQuiz(null);start(draftQuiz);
   }
  }catch(e){setReviewError(e instanceof Error?e.message:"Không lưu được Quiz.");}
  finally{setSavingReview(false)}
 }
 function editSavedQuiz(q:Quiz){
   setEditingId(q.id);setDraftQuiz(structuredClone(q));setReviewError("");go("review");
 }
 async function deleteSavedQuiz(q:Quiz){
   if(libraryBusy)return;
   if(!window.confirm(`Xóa vĩnh viễn bộ Quiz "${q.title}"?\n\nLịch sử làm bài của bộ Quiz này cũng sẽ bị xóa do quan hệ dữ liệu hiện tại. Không thể hoàn tác.`))return;
   setLibraryBusy(q.id);setStorageError("");
   try{
     const r=await fetch(`/api/quizzes/${encodeURIComponent(q.id)}`,{method:"DELETE"});
     if(!r.ok){const data=await r.json().catch(()=>({}));throw new Error(data.error||"Không xóa được Quiz");}
     setQuizzes(items=>items.filter(item=>item.id!==q.id));
     setAttempts(items=>items.filter(item=>item.quizId!==q.id));
     if(current?.id===q.id)setCurrent(null);
   }catch(e){setStorageError(e instanceof Error?e.message:"Không xóa được Quiz");}
   finally{setLibraryBusy(null)}
 }
 const chartData=useMemo(()=>{
   const now=new Date();
   return Array.from({length:7},(_,index)=>{
     const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-(6-index));
     const dateKey=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
     const records=attempts.filter(a=>{
       const t=new Date(a.finishedAt);return [t.getFullYear(),String(t.getMonth()+1).padStart(2,"0"),String(t.getDate()).padStart(2,"0")].join("-")===dateKey;
     });
     return {label:d.toLocaleDateString("vi-VN",{weekday:"short",day:"2-digit"}),count:records.length,average:records.length?Math.round(records.reduce((v,a)=>v+a.score/a.total*100,0)/records.length):0};
   });
 },[attempts]);
 async function finish(){
  if(!current||finished||learningBusy)return;
  const score=current.questions.reduce((sum,q,i)=>sum+(answers[i]===q.correctIndex?1:0),0);
  const a:Attempt={id:crypto.randomUUID(),quizId:current.id,title:current.title,score,total:current.questions.length,finishedAt:new Date().toISOString()};
  setLearningBusy(true);
  setFinished(a);setAttempts(old=>[a,...old]);go("results");
  try{
   if(current.demo){
    const r=await fetch("/api/attempts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({attempt:a,demoQuiz:current})});
    if(!r.ok)throw new Error((await r.json()).error||"Không lưu được bài làm mẫu");
   }else await persist("attempts","attempt",a);
   const r=await fetch("/api/learning",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({attemptId:a.id,answers:current.questions.map((_,i)=>answers[i]??-1)})});
   if(!r.ok){const body=await r.json().catch(()=>({}));throw new Error(body.error||"Không cập nhật được tiến độ học tập");}
   await refreshLearning();
  }catch(e){setStorageError("Không lưu đủ kết quả học tập: "+(e instanceof Error?e.message:String(e)));}
  finally{setLearningBusy(false)}
 }
 useEffect(()=>{
  if(screen!=="quiz" || !current || finished)return;
  const interval=setInterval(()=>setTimeLeft(Math.max(0,Math.ceil((quizDeadline.current-Date.now())/1000))),500);
  return ()=>clearInterval(interval);
 },[screen,current,finished]);
 useEffect(()=>{
  if(screen==="quiz" && current && !finished && timeLeft===0)finish();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[timeLeft,screen]);
 function reset(){setAnswers({});setIndex(0);quizDeadline.current=Date.now()+(current?.questions.length||0)*60000;setTimeLeft(current?.questions.length?current.questions.length*60:0);setFinished(null);go("quiz")}
 const question=current?.questions[index];const answeredCount=Object.keys(answers).length;
 if(!authReady)return <div className="auth-page"><div className="auth-card">Đang kiểm tra tài khoản...</div></div>;
 if(!user)return <div className="auth-page"><div className="auth-card">
  <div className="auth-logo"><BrainCircuit size={30}/> quizverse<span>.</span></div>
  <h1>{authMode==="login"?"Chào mừng bạn trở lại":"Tạo tài khoản QuizVerse"}</h1>
  <p>Lưu bài luyện tập và tiếp tục học trên mọi thiết bị.</p>
  <form onSubmit={authenticate}>
   {authMode==="register"&&<label>Họ và tên<input required minLength={2} maxLength={80} autoComplete="name" value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Tên của bạn"/></label>}
   <label>Email<input required type="email" autoComplete="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="ban@example.com"/></label>
   <label>Mật khẩu<input required type="password" minLength={10} maxLength={128} autoComplete={authMode==="register"?"new-password":"current-password"} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="Ít nhất 10 ký tự"/></label>
   {authError&&<div className="error-box" role="alert">{authError}</div>}{authNotice&&<div className="auth-success" role="status">{authNotice}</div>}
   <button className="primary-button auth-submit" disabled={authBusy}>{authBusy?"Đang xử lý...":authMode==="login"?"Đăng nhập":"Đăng ký"}<ArrowRight size={18}/></button>
  </form>
  <div className="auth-divider"><span>hoặc tiếp tục với</span></div>
  <button type="button" className="google-login-button" onClick={googleSignIn} disabled={authBusy} aria-label="Tiếp tục với Google">
   <svg width="21" height="21" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.88 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.85 23.85 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
   Tiếp tục với Google
  </button>
  <div className="auth-switch"><button type="button" disabled={authBusy} onClick={resendVerification}>Chưa nhận email? Gửi lại (nhập mật khẩu)</button></div>
  <div className="auth-switch">{authMode==="login"?"Chưa có tài khoản?":"Đã có tài khoản?"} <button onClick={()=>{resetAuthForm();setAuthMode(authMode==="login"?"register":"login")}}>{authMode==="login"?"Đăng ký ngay":"Đăng nhập"}</button></div>
 </div></div>;
 return <div className="app-shell">
  <aside className={`sidebar ${sideOpen?"open":""}`}>
   <button className="brand" onClick={()=>go("dashboard")}><span className="brand-icon"><BrainCircuit size={22}/></span><span>quizverse<span className="brand-ai">.</span><small>LEARN SOMETHING NEW</small></span></button>
   <div className="nav-heading">KHÔNG GIAN HỌC TẬP</div><nav>{navigation.map(item=><button key={item.id} className={`nav-item ${screen===item.id?"active":""}`} onClick={()=>go(item.id)}><item.icon size={19}/>{item.label}{item.id==="create"&&<span className="new-tag">AI</span>}</button>)}</nav>
   <div className="sidebar-bottom"><div className="upgrade"><span className="upgrade-icon"><Sparkles size={18}/></span><strong>Học điều bạn muốn</strong><p>Từ điều bạn tò mò đến kiến thức bạn thật sự hiểu.</p><button onClick={()=>go("create")}>Bắt đầu ngay <ArrowRight size={15}/></button></div><div className="profile"><span className="avatar">{user.name.trim().split(/\s+/).pop()?.charAt(0).toLocaleUpperCase("vi")||user.email.charAt(0).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><button className="logout-button" onClick={logout} title="Đăng xuất">Đăng xuất</button></div></div>
  </aside>
  {sideOpen&&<div className="overlay" onClick={()=>setSideOpen(false)}/>}
  <main className="main">
   <header className="topbar"><div className="top-left"><button className="mobile-menu icon-button" onClick={()=>setSideOpen(x=>!x)} aria-label="Mở menu"><Menu size={22}/></button><span className="crumb">QuizVerse</span><span className="slash">/</span><strong>{screen==="dashboard"?"Tổng quan":screen==="create"?"Tạo bài luyện tập":screen==="review"?"Kiểm tra & chỉnh sửa":screen==="library"?"Thư viện":screen==="analytics"?"Thống kê":screen==="learning"?"Học tập thích ứng":screen==="quiz"?"Đang làm Quiz":"Kết quả"}</strong></div><div className="top-actions"><span className="top-pill"><span className="dot"/>{storage==="turso"?"Đã kết nối Turso":"Không gian học tập"}</span><span className="top-avatar">{user.name.trim().split(/\s+/).pop()?.charAt(0).toLocaleUpperCase("vi")||user.email.charAt(0).toUpperCase()}</span></div></header>
   <div className="content">
    {storageError&&<div className="error-box" role="status">{storageError}</div>}
    {screen==="dashboard"&&<>
     <div className="welcome"><div className="hero-copy"><span className="eyebrow"><span className="eyebrow-dot"/> KHÔNG GIAN DÀNH CHO SỰ TÒ MÒ</span><h1>Kiến thức bắt đầu<br/>từ <span>một câu hỏi.</span></h1><p>Biến chủ đề bạn yêu thích thành một bài luyện tập vừa sức. Học thêm một chút, hiểu sâu thêm một chút — mỗi ngày.</p><div className="hero-actions"><button className="primary-button" onClick={()=>go("create")}>Tạo bài luyện tập <ArrowRight size={18}/></button><button className="hero-secondary" onClick={()=>startDemo("science")}>Thử bài mẫu <ArrowRight size={16}/></button></div><div className="hero-foot"><span><ShieldCheck size={15}/> Học theo tốc độ của bạn</span><span><Target size={15}/> Câu hỏi phù hợp mục tiêu</span></div></div><div className="hero-art" aria-hidden="true"><div className="hero-back-card"><span className="micro-tag">QUIZ / 001</span><div className="mini-bars"><i/><i/><i/><i/><i/></div><span>Knowledge unlocked</span></div><div className="hero-front-card"><div className="hero-card-top"><span className="mini-round">Q.</span><span>HÔM NAY HỌC GÌ?</span><span className="mini-dots">•••</span></div><div className="hero-card-icon"><BookOpen size={36} strokeWidth={1.6}/></div><strong>Mỗi ngày, một điều mới.</strong><p>Cứ tò mò. Phần còn lại để QuizVerse giúp bạn.</p><div className="hero-card-progress"><i/></div><div className="hero-card-footer"><span>YOUR LEARNING SPACE</span><span>01 / 04</span></div></div><div className="hero-spark"><Sparkles size={19}/></div></div></div>
     <div className="section-row stats"><div className="stat-card"><span className="stat-icon purple"><BookOpen size={20}/></span><small>BỘ CÂU HỎI</small><strong>{quizzes.length.toString().padStart(2,"0")}</strong><span>Tổng bộ câu hỏi</span></div><div className="stat-card"><span className="stat-icon blue"><CheckCircle2 size={20}/></span><small>BÀI ĐÃ LÀM</small><strong>{attempts.length.toString().padStart(2,"0")}</strong><span>Không ngừng tiến bộ</span></div><div className="stat-card"><span className="stat-icon peach"><Trophy size={20}/></span><small>ĐỘ CHÍNH XÁC</small><strong>{best}%</strong><span>Trung bình các bài</span></div></div>
     <div className="section-heading"><div><span className="eyebrow pale">CHỦ ĐỀ GỢI Ý</span><h2>Gợi ý để bắt đầu</h2><p>Một vài chủ đề thú vị dành cho buổi học hôm nay.</p></div><button className="text-button" onClick={()=>go("create")}>Tạo chủ đề riêng <ArrowRight size={16}/></button></div>
     <div className="topic-grid">{samples.map((s,i)=><button key={s.category} className={`topic-card topic-${i}`} onClick={()=>startDemo(s.category)}><span className="topic-icon"><s.icon size={24}/></span><span className="topic-tag">{s.tag}</span><strong>{s.name}</strong><span className="topic-bottom">Làm thử 5 câu <ArrowRight size={18}/></span></button>)}</div>
     <div className="section-heading smaller"><div><h2>Tiếp tục khám phá</h2><p>Các bài Quiz đã tạo và lưu trong không gian của bạn.</p></div><button className="text-button" onClick={()=>go("library")}>Xem tất cả <ArrowRight size={16}/></button></div>
     {quizzes.length?<div className="recent-list">{quizzes.slice(0,3).map(q=><button key={q.id} onClick={()=>start(q)}><span className="recent-icon"><BookOpen size={18}/></span><span><strong>{q.title}</strong><small>{q.questions.length} câu hỏi · {q.demo?"Bài mẫu":"Tạo từ chủ đề"}</small></span><ArrowRight size={17}/></button>)}</div>:<div className="empty-inline">Bạn chưa tạo bộ câu hỏi riêng nào. Hãy thử một chủ đề bạn thích.</div>}
    </>}
    {screen==="create"&&<><div className="page-heading"><span className="eyebrow">TẠO BÀI LUYỆN TẬP</span><h1>Bạn muốn học về điều gì?</h1><p>Một chủ đề bất kỳ cũng có thể trở thành một bộ câu hỏi thú vị.</p></div><div className="creator-layout"><div className="panel creator-panel"><div className="panel-title"><span className="circle-icon"><Sparkles size={19}/></span><div><h2>Nội dung bài luyện tập</h2><p>Chỉ cần một vài thông tin để bắt đầu</p></div></div><label className="field-label" htmlFor="topic">Chủ đề bạn muốn tạo Quiz</label><textarea id="topic" value={topic} maxLength={500} onChange={e=>setTopic(e.target.value)} placeholder="Ví dụ: Lập trình Unity C#, Anime One Piece, Lịch sử Việt Nam, Vật lý lượng tử..." rows={4}/><div className="hint"><Lightbulb size={15}/> Chủ đề bắt buộc khi chọn nguồn Chủ đề; với Văn bản, PDF/DOCX hoặc URL, bạn có thể để trống để ứng dụng tự đặt tên.</div>
 <div className="source-modes" role="group" aria-label="Nguồn tạo Quiz">{([ ["topic","Chủ đề"],["text","Văn bản"],["file","PDF / DOCX"],["url","URL"]] as const).map(([value,label])=><button key={value} type="button" className={sourceMode===value?"chosen":""} onClick={()=>{setSourceMode(value);setError("");setExtractionInfo("")}}>{label}</button>)}</div>
 {sourceMode==="text"&&<><label className="field-label" htmlFor="sourceText">Dán nội dung tham khảo</label><textarea id="sourceText" rows={7} maxLength={45000} value={sourceText} onChange={e=>setSourceText(e.target.value)} placeholder="Dán bài học, ghi chú hoặc văn bản cần ôn tập (ít nhất 100 ký tự)..."/><small>{sourceText.length.toLocaleString("vi-VN")}/45.000 ký tự</small></>}
 {sourceMode==="file"&&<div className="source-upload"><label className="field-label" htmlFor="sourceFile">Tải tài liệu (PDF, DOCX, TXT; tối đa 20 MB)</label><input id="sourceFile" type="file" accept=".pdf,.docx,.txt" onChange={e=>setSourceFile(e.target.files?.[0]||null)}/><small>PDF dạng scan chưa hỗ trợ OCR. Với tài liệu dài, hệ thống phân tích tuần tự tất cả các phần văn bản (tối đa 2 triệu ký tự) rồi tạo Quiz từ bản tổng hợp; quá giới hạn sẽ báo lỗi, không âm thầm bỏ nội dung. File gốc không được lưu.</small></div>}
 {sourceMode==="url"&&<><label className="field-label" htmlFor="sourceUrl">Đường dẫn bài viết HTTPS</label><input id="sourceUrl" type="url" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://example.com/bai-viet"/><small>Chỉ hỗ trợ trang HTML công khai, không hỗ trợ các trang yêu cầu đăng nhập.</small></>}
 {extractionInfo&&<div className="hint" role="status">{extractionInfo}</div>}<div className="form-grid"><div><label className="field-label" htmlFor="count">Số câu hỏi</label><select id="count" value={count} onChange={e=>setCount(Number(e.target.value))}>{[5,10,15,20,25,30,40,50].map(n=><option key={n} value={n}>{n} câu hỏi</option>)}</select></div><div><label className="field-label" htmlFor="difficulty">Độ khó</label><select id="difficulty" value={difficulty} onChange={e=>setDifficulty(e.target.value as Difficulty)}><option value="easy">Dễ · Cơ bản</option><option value="medium">Vừa · Cân bằng</option><option value="hard">Khó · Thử thách</option></select></div></div>{error&&<div className="error-box" role="alert"><AlertCircle size={17}/>{error}</div>}
 {loading&&<div className="generation-status" role="status" aria-live="polite">
  <div className="generation-status-top"><span className="generation-spinner"><LoaderCircle size={22}/></span><div><strong>{generationStep==="extract"?"Đang đọc nội dung tài liệu":generationStep==="generate"?"Đang tạo bộ câu hỏi của bạn":"Đang lưu bộ câu hỏi"}</strong><p>{count} câu hỏi · {topic.trim() || "Nội dung đã chọn"}</p></div><span className="generation-clock"><Clock3 size={14}/>{Math.floor(generationSeconds/60).toString().padStart(2,"0")}:{(generationSeconds%60).toString().padStart(2,"0")}</span></div>
  {documentProgress && generationStep==="extract" && <p className="generation-advice">Đã phân tích {documentProgress.done}/{documentProgress.total} phần tài liệu. Đang tổng hợp kiến thức từ toàn bộ nguồn.</p>}
  <div className="generation-steps"><span className={generationStep!=="extract"?"done":"active"}>{generationStep!=="extract"?<CheckCircle2 size={15}/>:<LoaderCircle size={15}/>} Đọc nguồn</span><span className={generationStep==="generate"?"active":generationStep==="save"?"done":"waiting"}>{generationStep==="save"?<CheckCircle2 size={15}/>:generationStep==="generate"?<LoaderCircle size={15}/>:<Clock3 size={15}/>} Tạo câu hỏi</span><span className={generationStep==="save"?"active":"waiting"}>{generationStep==="save"?<LoaderCircle size={15}/>:<Clock3 size={15}/>} Lưu bài luyện tập</span></div>
  {generationStep==="generate" && questionProgress ? <>
   <p className="generation-advice"><strong>Đã tạo {questionProgress.done}/{questionProgress.total} câu hỏi</strong> · Tiến độ xác thực theo nhóm 5 câu</p>
   <div className="generation-progress-track" role="progressbar" aria-label="Số câu đã hoàn tất" aria-valuenow={questionProgress.done} aria-valuemin={0} aria-valuemax={questionProgress.total} style={{height:8,background:"#e8e4f5",borderRadius:999,overflow:"hidden"}}><div style={{height:"100%",width:`${questionProgress.done/questionProgress.total*100}%`,background:"#8066EA",transition:"width .25s"}}/></div>
  </> : <div className="generation-indeterminate" aria-label="Đang xử lý, chưa có phần trăm tiến độ"><span/></div>}
  <p className="generation-advice">{generationSeconds<20?"Bộ câu hỏi dài hoặc tài liệu nhiều nội dung có thể cần thêm thời gian.":generationSeconds<55?"Hệ thống đang xây dựng câu hỏi và đáp án. Bạn có thể hủy nếu không muốn chờ.":"Đã chờ khá lâu. Bạn có thể hủy và thử lại với ít câu hơn."}</p>
  <button type="button" className="generation-cancel" onClick={cancelGeneration}><Square size={13}/> Hủy tạo Quiz</button>
 </div>}
 <button className="primary-button create-submit" onClick={generate} disabled={loading}><Sparkles size={19}/>{loading?"Đang tạo, vui lòng chờ...":"Tạo bộ câu hỏi"}<ArrowRight size={17}/></button><div className="security-note">Bạn có thể tạo tiếp nhiều bộ câu hỏi. Nếu thiếu dữ liệu, ứng dụng sẽ hướng dẫn bổ sung.</div></div><div className="creator-aside"><div className="aside-gradient"><span className="shine"><BrainCircuit size={35}/></span><h3>Học chậm một chút.<br/>Hiểu sâu hơn nhiều.</h3><p>Trả lời, xem lời giải và ôn lại những phần bạn chưa chắc.</p></div><div className="panel demo-panel"><h3><Compass size={18}/> Muốn thử trước?</h3><p>Các bộ câu hỏi mẫu này có thể làm ngay, không cần kết nối dịch vụ AI.</p><div className="demo-list">{demoCategories.map(cat=><button key={cat.key} onClick={()=>startDemo(cat.key)}>{cat.label}<ArrowRight size={15}/></button>)}</div></div></div></div></>}
    {screen==="review"&&draftQuiz&&<section className="quiz-editor">
      <div className="page-heading"><span className="eyebrow">QUIZ REVIEW & EDITOR</span><h1>Kiểm tra và chỉnh sửa câu hỏi</h1><p>Chỉ lưu và bắt đầu làm bài sau khi bạn xác nhận. Hệ thống phát hiện lỗi cấu trúc và câu gần trùng, nhưng không thể tự bảo đảm đáp án đúng về kiến thức.</p></div>
      <div className="editor-toolbar panel">
       <label className="editor-field">Tên bộ Quiz<input value={draftQuiz.title} maxLength={150} onChange={e=>{setDraftQuiz(q=>q?{...q,title:e.target.value}:null);setReviewError("")}}/></label>
       <p><strong>{draftQuiz.questions.length} câu</strong> · {draftQuiz.difficulty} · {editingId?"Chỉnh sửa bộ Quiz đã lưu":"Chưa lưu vào thư viện"}</p>
       {reviewWarnings(draftQuiz).length>0?<div className="editor-alert" role="alert"><AlertCircle size={18}/><div><strong>Phát hiện {reviewWarnings(draftQuiz).length} cảnh báo cần xử lý</strong>{reviewWarnings(draftQuiz).map((w,i)=><p key={i}>{w}</p>)}</div></div>:<p className="editor-success"><CheckCircle2 size={17}/> Không phát hiện lỗi cấu trúc hoặc câu trùng theo phép kiểm tra tự động.</p>}
      </div>
      {draftQuiz.questions.map((q,i)=><article key={q.id} className="panel editor-question">
       <div className="editor-question-head"><strong>Câu hỏi {i+1}</strong><button type="button" className="secondary-button" onClick={()=>setDraftQuiz(prev=>prev?{...prev,questions:prev.questions.filter((_,j)=>j!==i)}:prev)} disabled={draftQuiz.questions.length<=1}>Xóa câu</button></div>
       <label className="editor-field">Nội dung câu hỏi<textarea rows={2} maxLength={2500} value={q.question} onChange={e=>editDraftQuestion(i,{question:e.target.value})}/></label>
       <div className="editor-options">{q.options.map((opt,j)=><label className="editor-field" key={j}>Đáp án {String.fromCharCode(65+j)}<input maxLength={1500} value={opt} onChange={e=>editDraftQuestion(i,{options:q.options.map((v,k)=>k===j?e.target.value:v)})}/></label>)}</div>
       <label className="editor-field">Đáp án đúng<select value={q.correctIndex} onChange={e=>editDraftQuestion(i,{correctIndex:Number(e.target.value)})}>{q.options.map((_,j)=><option value={j} key={j}>Đáp án {String.fromCharCode(65+j)}</option>)}</select></label>
       <label className="editor-field">Giải thích<textarea rows={2} maxLength={5000} value={q.explanation} onChange={e=>editDraftQuestion(i,{explanation:e.target.value})}/></label>
      </article>)}
      {reviewError&&<div className="error-box" role="alert">{reviewError}</div>}
      <div className="editor-actions"><button className="secondary-button" type="button" onClick={()=>{setDraftQuiz(null);setEditingId(null);go(editingId?"library":"create")}}>{editingId?"Hủy chỉnh sửa":"Bỏ bản nháp"}</button><button className="secondary-button" type="button" disabled={draftQuiz.questions.length>=50} onClick={()=>setDraftQuiz(q=>q?{...q,questions:[...q.questions,{id:crypto.randomUUID(),question:"",options:["","", "", ""],correctIndex:0,explanation:""}]}:q)}>Thêm câu hỏi</button><button className="primary-button" type="button" disabled={savingReview||!draftQuiz.title.trim()||reviewWarnings(draftQuiz).length>0} onClick={()=>void confirmDraft()}>{savingReview?"Đang lưu...":(editingId?"Lưu thay đổi":"Xác nhận, lưu và làm bài")}</button></div>
    </section>}
    {screen==="quiz"&&current&&question&&<><div className="quiz-top"><button className="back-link" onClick={()=>go("library")}><ArrowLeft size={17}/> Thư viện</button><span className="quiz-chip"><Clock3 size={15}/> {`Còn ${Math.floor(timeLeft/60).toString().padStart(2,"0")}:${(timeLeft%60).toString().padStart(2,"0")}`}</span></div><div className="quiz-wrapper"><div className="quiz-meta"><span>CHỦ ĐỀ · {current.topic}</span><span>CÂU {index+1} / {current.questions.length}</span></div><div className="progress-track"><div style={{width:`${(index+1)/current.questions.length*100}%`}}/></div><div className="question-card"><div className="question-label"><span className="question-icon"><BrainCircuit size={20}/></span>Câu hỏi {index+1}</div><h2><MathText text={question.question}/></h2><div className="answers">{question.options.map((opt,i)=><button key={i} className={`answer ${answers[index]===i?"selected":""}`} onClick={()=>setAnswers(a=>({...a,[index]:i}))}><span>{String.fromCharCode(65+i)}</span><MathText text={opt}/><span className="answer-check">{answers[index]===i?<Check size={19}/>:null}</span></button>)}</div></div><div className="quiz-footer"><button className="secondary-button" onClick={()=>setIndex(i=>Math.max(0,i-1))} disabled={index===0}><ArrowLeft size={16}/> Câu trước</button><span>Đã trả lời {answeredCount}/{current.questions.length}</span>{index===current.questions.length-1?<button className="primary-button" onClick={finish} disabled={answeredCount!==current.questions.length}>Nộp bài <CheckCircle2 size={17}/></button>:<button className="primary-button" onClick={()=>setIndex(i=>i+1)}>Câu tiếp <ArrowRight size={17}/></button>}</div></div></>}
    {screen==="results"&&current&&finished&&<><div className="result-head"><span className="result-trophy"><Trophy size={35}/></span><span className="eyebrow">HOÀN THÀNH QUIZ</span><h1>Bạn đã hoàn thành bài luyện tập</h1><p>{current.title}</p><div className="result-score"><strong>{Math.round(finished.score/finished.total*100)}%</strong><span>{finished.score}/{finished.total} câu đúng</span></div><div className="result-buttons"><button className="secondary-button" onClick={()=>go("dashboard")}>Về trang chủ</button><button className="primary-button" onClick={reset}><RotateCcw size={16}/> Làm lại Quiz</button></div></div><div className="review-section"><h2>Chi tiết đáp án</h2>{current.questions.map((q,i)=>{const chosen=answers[i],correct=chosen===q.correctIndex;return <div key={q.id} className="review-card"><div className="review-title">{correct?<CheckCircle2 size={19} className="correct"/>:<XCircle size={19} className="incorrect"/>}<strong>Câu {i+1}. <MathText text={q.question}/></strong></div><div className="review-detail">Bạn chọn: <b className={correct?"correct":"incorrect"}>{q.options[chosen]??"Không trả lời"}</b></div>{!correct&&<div className="review-detail">Đáp án đúng: <b className="correct">{q.options[q.correctIndex]}</b></div>}<div className="explanation"><Lightbulb size={16}/><MathText text={q.explanation}/></div></div>})}</div></>}
    {screen==="library"&&<><div className="page-heading"><span className="eyebrow">BỘ SƯU TẬP</span><h1>Thư viện Quiz</h1><p>Những bộ câu hỏi bạn đã tạo và lưu lại.</p></div>{quizzes.length?<div className="library-grid">{quizzes.map(q=><div className="library-card" key={q.id}><span className="library-icon"><BookOpen size={23}/></span><span className="library-badge">{q.demo?"DEMO":"TỰ TẠO"}</span><h3>{q.title}</h3><p>{q.topic}</p><div className="library-bottom"><span>{q.questions.length} câu · {q.difficulty}</span><div className="library-actions"><button onClick={()=>editSavedQuiz(q)} disabled={!!libraryBusy} title="Sửa Quiz"><Pencil size={15}/> Sửa</button><button className="danger-action" onClick={()=>void deleteSavedQuiz(q)} disabled={!!libraryBusy} title="Xóa Quiz"><Trash2 size={15}/> Xóa</button><button onClick={()=>start(q)}>Bắt đầu <ArrowRight size={16}/></button></div></div></div>)}</div>:<div className="large-empty"><BookOpen size={38}/><h3>Thư viện đang trống</h3><p>Tạo Quiz của riêng bạn để lưu vào bộ sưu tập. Các bài mẫu chỉ được ghi vào lịch sử sau khi nộp bài.</p><button className="primary-button" onClick={()=>go("create")}>Tạo Quiz đầu tiên <ArrowRight size={17}/></button></div>}</>}
    {screen==="learning"&&<section className="adaptive-page">
      <div className="page-heading"><span className="eyebrow">PHASE 5 · ADAPTIVE LEARNING</span><h1>Lộ trình học tập của bạn</h1><p>Độ khó đề xuất được tính từ kết quả các bài đã làm. Mức thành thạo chỉ mang tính ước lượng, không phải đánh giá năng lực tuyệt đối.</p></div>
      <div className="adaptive-summary"><div className="panel"><small>CHỦ ĐỀ ĐÃ LUYỆN</small><h2>{mastery.length}</h2></div><div className="panel"><small>CÂU CẦN ÔN HÔM NAY</small><h2>{reviewDue.length}</h2></div><div className="panel"><small>THÀNH THẠO TRUNG BÌNH</small><h2>{mastery.length?Math.round(mastery.reduce((s,t)=>s+t.strength,0)/mastery.length*100):0}%</h2></div></div>
      <div className="panel adaptive-panel"><div className="adaptive-panel-head"><div><h2>Ôn tập theo khoảng cách</h2><p>Những câu đã sai sẽ xuất hiện lại theo lịch. Khi trả lời đúng, khoảng cách ôn tập được tăng dần.</p></div><button className="primary-button" disabled={!reviewDue.length||learningBusy} onClick={practiceDue}>Ôn {Math.min(10,reviewDue.length)} câu đến hạn <ArrowRight size={16}/></button></div>
       {reviewDue.length?<div className="adaptive-due-list">{reviewDue.slice(0,6).map(c=><div key={c.id} className="adaptive-due-row"><div><small>{c.topic}</small><strong>{c.question}</strong></div><button className="secondary-button" onClick={()=>{setTutorId(tutorId===c.id?null:c.id);setTutorResponse("");setTutorQuestion("");}}>Hỏi gia sư</button>{tutorId===c.id&&<div className="adaptive-tutor"><p><strong>Giải thích ban đầu:</strong> {c.explanation}</p><label>Điều bạn chưa hiểu<textarea rows={2} maxLength={800} value={tutorQuestion} onChange={e=>setTutorQuestion(e.target.value)} placeholder="Ví dụ: Vì sao đáp án này đúng?"/></label><button className="primary-button" disabled={tutorBusy||tutorQuestion.trim().length<3} onClick={()=>void askTutor(c)}>{tutorBusy?"Đang giải thích...":"Hỏi QuizVerse AI Tutor"}</button>{tutorResponse&&<p className="tutor-response">{tutorResponse}</p>}</div>}</div>)}</div>:<p className="adaptive-empty">Hiện chưa có câu hỏi đến hạn. Hãy làm thêm Quiz để xây dựng lịch ôn tập.</p>}
      </div>
      <div className="panel adaptive-panel"><h2>Mức thành thạo theo chủ đề</h2>{mastery.length?<div className="adaptive-topics">{mastery.map(t=><div className="adaptive-topic" key={t.topic}><div className="adaptive-topic-title"><strong>{t.topic}</strong><span>{Math.round(t.strength*100)}% · {t.correct}/{t.answered} câu đúng</span></div><div className="adaptive-track"><div style={{width:`${t.strength*100}%`}}/></div><div className="adaptive-topic-foot"><small>Gợi ý độ khó: {t.recommendedDifficulty==="easy"?"Dễ":t.recommendedDifficulty==="medium"?"Trung bình":"Khó"} · Chuỗi bài tốt: {t.streak}</small><button className="secondary-button" onClick={()=>recommendedQuiz(t)}>Tạo Quiz thích ứng <ArrowRight size={14}/></button></div></div>)}</div>:<p className="adaptive-empty">Chưa có dữ liệu thành thạo. Hoàn thành một bài Quiz để bắt đầu.</p>}</div>
     </section>}
    {screen==="analytics"&&<><div className="page-heading"><span className="eyebrow">HỌC TẬP</span><h1>Thống kê học tập</h1><p>Nhìn lại những điều bạn đã học được.</p></div><div className="section-row stats"><div className="stat-card"><span className="stat-icon purple"><BookOpen size={20}/></span><small>BỘ CÂU HỎI</small><strong>{quizzes.length}</strong></div><div className="stat-card"><span className="stat-icon blue"><CheckCircle2 size={20}/></span><small>BÀI ĐÃ LÀM</small><strong>{attempts.length}</strong></div><div className="stat-card"><span className="stat-icon peach"><Trophy size={20}/></span><small>ĐIỂM TRUNG BÌNH</small><strong>{best}%</strong></div></div><div className="panel qv-chart-panel"><div className="qv-chart-head"><h2>Hoạt động 7 ngày gần nhất</h2><p>Số lượt làm bài theo ngày · thống kê từ lịch sử của bạn</p></div><div className="qv-bar-chart" role="img" aria-label="Biểu đồ cột số lượt làm bài 7 ngày gần nhất">{chartData.map((day,i)=><div className="qv-bar-group" key={i}><strong>{day.count}</strong><div className="qv-bar-track"><div className="qv-bar" style={{height:`${day.count?Math.max(7,day.count/Math.max(1,...chartData.map(d=>d.count))*100):0}%`}} title={`${day.count} lượt · Điểm TB ${day.average}%`}/></div><small>{day.label}</small></div>)}</div>{!attempts.length&&<p className="qv-chart-empty">Chưa có bài làm. Biểu đồ sẽ tự cập nhật khi bạn nộp Quiz.</p>}</div><div className="panel history-panel"><h2>Lịch sử luyện tập</h2>{attempts.length?attempts.map(a=><div className="history-row" key={a.id}><span className="recent-icon"><GraduationCap size={17}/></span><div><strong>{a.title}</strong><small>{new Date(a.finishedAt).toLocaleString("vi-VN")}</small></div><strong>{a.score}/{a.total}</strong></div>):<p>Chưa có lần luyện tập nào. Hãy bắt đầu Quiz để xem thống kê.</p>}</div></>}
   </div>
  </main>
 </div>
}
