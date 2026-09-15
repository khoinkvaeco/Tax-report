/* =====================================================================
 *  CẤU HÌNH KẾT NỐI SUPABASE
 *
 *  ⚠️ CHỈ CẦN SỬA 2 DÒNG DƯỚI ĐÂY.
 *  Lấy 2 giá trị này trong Supabase:  Project Settings > API
 *    - Project URL         -> dán vào SUPABASE_URL
 *    - Project API keys > anon public -> dán vào SUPABASE_ANON_KEY
 *
 *  Khóa "anon public" được phép để công khai trong trang web: dữ liệu vẫn
 *  an toàn nhờ phân quyền RLS trong cơ sở dữ liệu. (KHÔNG dùng khóa
 *  "service_role" ở đây — khóa đó bỏ qua mọi phân quyền.)
 * ===================================================================== */
window.SUPABASE_URL      = 'https://xxxxxxxxxxxxxxxx.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltYmJyeW5pYWVmc2F1a2R6am1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NzQxMjEsImV4cCI6MjEwNTA1MDEyMX0.a7Cclmv2zxKojlEfa4zdg3mAx1PWfru9lMEm2M7TpBM';

// Link trang tra cứu VPĐT (đổi nếu VPĐT thay địa chỉ)
window.VPDT_URL_BASE = 'http://vpdt.cucthue.hochiminhcity.gov.vn/group/kv/tcvbdi';
