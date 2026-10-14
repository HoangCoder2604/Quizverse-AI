"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
function VerifyForm(){
  const params=useSearchParams();const token=params.get("token")||"";
  const [status,setStatus]=useState("");const [busy,setBusy]=useState(false);const [success,setSuccess]=useState(false);
  async function confirm(){setBusy(true);setStatus("");try{
    const response=await fetch("/api/auth/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||"Không thể xác minh");
    setSuccess(true);setStatus(data.message||"Email đã xác minh thành công!");
  }catch(e){setStatus(e instanceof Error?e.message:"Có lỗi xảy ra")}finally{setBusy(false)}}
  return <div className="auth-page"><section className="auth-card"><div className="auth-logo">quizverse<span>.</span></div><h1>Xác minh địa chỉ email</h1><p>Nhấn nút dưới đây để kích hoạt tài khoản của bạn. Liên kết chỉ sử dụng được một lần và hết hạn sau 30 phút.</p>
    {status&&<div role="status" className={success?"auth-success":"error-box"}>{status}</div>}
    {success?<a className="primary-button auth-submit" href="/">Đến trang đăng nhập</a>:<button className="primary-button auth-submit" disabled={!/^[a-f0-9]{64}$/.test(token)||busy} onClick={confirm}>{busy?"Đang xác minh...":"Xác minh email"}</button>}
    {!token&&<p>Liên kết thiếu mã xác minh. Hãy yêu cầu gửi lại email từ màn hình đăng nhập.</p>}
  </section></div>
}
export default function VerifyEmailPage(){return <Suspense fallback={<div className="auth-page">Đang tải...</div>}><VerifyForm/></Suspense>}
