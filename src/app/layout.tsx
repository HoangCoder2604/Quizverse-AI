import "./auth.css";
import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import "./redesign.css";
import "./premium.css";
import "./colorful.css";
export const metadata: Metadata = {title:"QuizVerse — Học điều bạn muốn",description:"Tạo và luyện tập quiz thông minh từ bất kỳ chủ đề nào với AI."};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="vi"><body>{children}</body></html>}
