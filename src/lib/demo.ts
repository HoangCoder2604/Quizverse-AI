import type { Difficulty, Quiz, Question } from "./types";
const sets: Record<string, { label: string; questions: Omit<Question,"id">[] }> = {
  "unity": {label:"Unity & Game Development",questions:[
    {question:"Trong Unity, FixedUpdate thường được sử dụng cho công việc nào?",options:["Vẽ giao diện UI","Cập nhật physics","Tải scene","Xử lý render camera"],correctIndex:1,explanation:"FixedUpdate chạy theo bước thời gian cố định, thường dùng cho tính toán và thao tác liên quan đến vật lý."},
    {question:"ScriptableObject phù hợp nhất để làm gì?",options:["Lưu cấu hình dữ liệu chia sẻ","Thay thế hoàn toàn GameObject","Chạy animation","Phát âm thanh trực tiếp"],correctIndex:0,explanation:"ScriptableObject là container dữ liệu độc lập với scene, hữu ích cho cấu hình và chia sẻ dữ liệu."},
    {question:"Object Pooling giúp giảm vấn đề nào?",options:["Số lượng shader","Chi phí Instantiate/Destroy liên tục","Tốc độ mạng","Độ phân giải texture"],correctIndex:1,explanation:"Tái sử dụng đối tượng làm giảm chi phí tạo/hủy và áp lực lên GC."},
    {question:"Lớp nào chứa velocity trong hệ vật lý 3D Unity?",options:["Transform","Animator","Rigidbody","Collider"],correctIndex:2,explanation:"Rigidbody quản lý động lực học của vật thể 3D."},
    {question:"Raycast kết hợp LayerMask nhằm mục đích gì?",options:["Lọc đối tượng có thể bị ray chạm","Tăng FPS gấp đôi","Phát hiện phím bấm","Tạo ánh sáng"],correctIndex:0,explanation:"LayerMask giúp giới hạn layer được đưa vào kiểm tra raycast."}
  ]},
  "math": {label:"Toán học",questions:[
    {question:"Đạo hàm của f(x) = x² là gì?",options:["x","2x","x³","2"],correctIndex:1,explanation:"Theo quy tắc đạo hàm lũy thừa: (xⁿ)' = nxⁿ⁻¹."},
    {question:"Tổng ba góc trong tam giác phẳng bằng bao nhiêu?",options:["90°","270°","180°","360°"],correctIndex:2,explanation:"Trong hình học Euclid, tổng ba góc trong tam giác là 180°."},
    {question:"Giá trị của log₂(8) là bao nhiêu?",options:["2","3","4","8"],correctIndex:1,explanation:"Vì 2³ = 8 nên log₂(8) = 3."},
    {question:"Nghiệm của phương trình 2x + 6 = 0 là?",options:["3","-3","6","-6"],correctIndex:1,explanation:"2x=-6 nên x=-3."},
    {question:"Xác suất xuất hiện mặt ngửa khi tung đồng xu cân đối là?",options:["1/4","1/3","1/2","1"],correctIndex:2,explanation:"Hai kết quả có khả năng như nhau, nên xác suất mặt ngửa là 1/2."}
  ]},
  "history": {label:"Lịch sử thế giới",questions:[
    {question:"Chiến tranh thế giới thứ hai kết thúc vào năm nào?",options:["1918","1939","1945","1954"],correctIndex:2,explanation:"Chiến tranh thế giới thứ hai kết thúc năm 1945."},
    {question:"Nền văn minh nào xây dựng các kim tự tháp Giza?",options:["Hy Lạp cổ đại","Ai Cập cổ đại","La Mã cổ đại","Maya"],correctIndex:1,explanation:"Các kim tự tháp Giza do người Ai Cập cổ đại xây dựng."},
    {question:"Cuộc Cách mạng Pháp bắt đầu năm nào?",options:["1492","1789","1848","1917"],correctIndex:1,explanation:"Cách mạng Pháp khởi đầu vào năm 1789."},
    {question:"Thủ đô của Đế quốc Đông La Mã (Byzantine) là?",options:["Athens","Rome","Constantinople","Alexandria"],correctIndex:2,explanation:"Constantinople là thủ đô nổi bật của Đế quốc Byzantine."},
    {question:"Bức tường Berlin sụp đổ vào năm nào?",options:["1975","1989","1991","2001"],correctIndex:1,explanation:"Bức tường Berlin được mở cửa vào tháng 11 năm 1989."}
  ]},
  "science": {label:"Khoa học tổng hợp",questions:[
    {question:"Công thức hóa học của nước là gì?",options:["CO₂","NaCl","H₂O","O₂"],correctIndex:2,explanation:"Một phân tử nước chứa hai nguyên tử hydro và một nguyên tử oxy."},
    {question:"Hành tinh nào gần Mặt Trời nhất?",options:["Kim Tinh","Thủy Tinh","Trái Đất","Hỏa Tinh"],correctIndex:1,explanation:"Thủy Tinh (Mercury) có quỹ đạo gần Mặt Trời nhất."},
    {question:"Đơn vị SI của lực là gì?",options:["Joule","Watt","Newton","Pascal"],correctIndex:2,explanation:"Newton (N) là đơn vị lực trong hệ SI."},
    {question:"Cơ quan chính bơm máu trong cơ thể người là?",options:["Phổi","Thận","Gan","Tim"],correctIndex:3,explanation:"Tim co bóp để bơm máu qua hệ tuần hoàn."},
    {question:"Thực vật hấp thụ khí nào chủ yếu trong quang hợp?",options:["Nitơ","Carbon dioxide","Heli","Hydro"],correctIndex:1,explanation:"Thực vật sử dụng CO₂, nước và năng lượng ánh sáng để tổng hợp chất hữu cơ."}
  ]}
};
export const demoCategories = Object.entries(sets).map(([key, value]) => ({key,label:value.label}));
export function makeDemoQuiz(category: string, count: number, difficulty: Difficulty): Quiz {
  const found = sets[category] || sets.unity;
  const original = found.questions;
  const questions = Array.from({length:Math.min(count,original.length)}, (_,i) => ({...original[i%original.length],id:`demo-${i+1}`}));
  return {id:crypto.randomUUID(),title:`${found.label} · Quiz demo`,topic:found.label,difficulty,questions,createdAt:new Date().toISOString(),demo:true};
}
