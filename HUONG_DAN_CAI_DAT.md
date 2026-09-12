# Hướng dẫn cài đặt — KT4 trên Supabase

Tài liệu này viết cho người **không chuyên IT**. Cứ làm tuần tự từng bước.
Toàn bộ đều **miễn phí** và **không cần cài phần mềm** trên máy.

> Tổng thời gian: khoảng **30–45 phút** cho lần đầu.

---

## Bước 1 — Tạo tài khoản & dự án Supabase (nơi chứa dữ liệu)

1. Vào **https://supabase.com** → bấm **Start your project** → đăng nhập (có thể dùng tài khoản GitHub hoặc email).
2. Bấm **New project**.
   - **Name**: `kt4-tax-report` (tùy ý)
   - **Database Password**: đặt một mật khẩu mạnh và **lưu lại** (dùng cho quản trị sau này).
   - **Region**: chọn **Southeast Asia (Singapore)** cho gần Việt Nam.
3. Bấm **Create new project**, chờ 1–2 phút cho hệ thống dựng xong.

---

## Bước 2 — Tạo bảng và phân quyền (chạy 4 file SQL)

Vào dự án vừa tạo → menu trái chọn **SQL Editor** → **New query**.

Chạy **lần lượt** 4 file trong thư mục `supabase/` (mở file, copy toàn bộ, dán vào ô rồi bấm **Run**). Chạy đúng thứ tự:

1. `supabase/01_schema.sql` — tạo bảng
2. `supabase/02_business_logic.sql` — công thức tự tính
3. `supabase/03_phan_quyen_rls.sql` — phân quyền
4. `supabase/04_seed.sql` — nạp sẵn 28 cán bộ và ngày nghỉ lễ

Mỗi lần chạy thấy báo **Success** là được.

---

## Bước 3 — Tạo tài khoản đăng nhập cho cán bộ

Mỗi cán bộ cần một tài khoản (email + mật khẩu) để đăng nhập.

1. Menu trái → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Nhập **email** và **mật khẩu** cho cán bộ đó → **Create user**.
3. Làm lại cho từng cán bộ (hoặc tạo dần khi cần).

> Mẹo: nên tạo trước tài khoản **admin** (của bạn) để thử nghiệm.

---

## Bước 4 — Gắn email vào danh sách cán bộ & phân quyền

1. Menu trái → **Table Editor** → chọn bảng **`can_bo`**.
2. Với mỗi cán bộ, điền **email** (đúng email vừa tạo ở Bước 3) vào cột `email`.
3. Cột `vaitro` đặt một trong ba giá trị:
   - `admin` — quản trị, xem & sửa mọi hồ sơ (đặt cho ít nhất 1 người)
   - `lanhdao` — lãnh đạo phòng, xem & sửa mọi hồ sơ
   - `congchuc` — chỉ xem/sửa hồ sơ mình có tên trong đoàn
4. (Tùy chọn) Nếu có **phó phòng** phụ trách một số đoàn theo giai đoạn: mở bảng
   **`phancong_pp`** và thêm dòng: email phó phòng, tên trưởng đoàn phụ trách,
   từ ngày, đến ngày.

> Ai đăng nhập bằng email **không có** trong bảng `can_bo` sẽ là "khách" và
> không thấy hồ sơ nào — đúng như hệ thống cũ.

---

## Bước 5 — Cấu hình trang web kết nối tới Supabase

1. Trên Supabase: **Project Settings** (bánh răng) → **API**. Ghi lại 2 giá trị:
   - **Project URL**
   - **Project API keys → `anon` `public`**
2. Mở file `web/config.js`, dán 2 giá trị đó vào đúng 2 dòng:
   ```js
   window.SUPABASE_URL      = 'https://....supabase.co';
   window.SUPABASE_ANON_KEY = 'ey....';
   ```
   Lưu file.

> Khóa `anon public` được phép công khai — dữ liệu vẫn an toàn nhờ phân quyền
> RLS. **Tuyệt đối không** dùng khóa `service_role` ở đây.

---

## Bước 6 — Đưa trang web lên mạng (miễn phí)

Chọn **một** trong các cách dưới (dễ nhất là Netlify Drop):

### Cách A — Netlify Drop (kéo–thả, không cần tài khoản git)
1. Vào **https://app.netlify.com/drop**.
2. Kéo **cả thư mục `web`** (đã sửa `config.js`) thả vào trang đó.
3. Netlify cho ngay một địa chỉ dạng `https://ten-ngau-nhien.netlify.app` — đó là link dùng chung cho cả phòng.

### Cách B — Cloudflare Pages / Vercel / GitHub Pages
Tạo site tĩnh trỏ tới thư mục `web`. (Nhờ người quen IT nếu cần.)

### Cách C — Chạy thử ngay trên máy (không cần mạng ngoài)
Mở thư mục `web` bằng terminal rồi chạy: `python3 -m http.server 8080`,
sau đó mở trình duyệt vào `http://localhost:8080`.

> ⚠️ **Quan trọng về đăng nhập:** sau khi có link web, quay lại Supabase →
> **Authentication → URL Configuration**, thêm địa chỉ web (ví dụ
> `https://...netlify.app`) vào **Site URL / Redirect URLs** để đăng nhập hoạt động trơn tru.

---

## Bước 7 — Chuyển dữ liệu cũ từ Google Sheets sang (nếu cần)

1. Trong Google Sheets cũ: chạy hàm `SUA_MST_MAT_SO_0` một lần để làm sạch MST.
2. Xuất từng sheet ra CSV (**File → Download → CSV**):
   - Sheet `DATA` → nạp vào bảng `ho_so`
   - Sheet `VPDT_IMPORT` → bảng `vpdt`
   - Sheet `ds NNT` → bảng `ds_nnt`
3. Trên Supabase: **Table Editor** → chọn bảng → **Insert → Import data from CSV**.
   Ghép cột CSV với cột bảng cho đúng tên (tham khảo `01_schema.sql`).

> Nếu dữ liệu cũ chưa nhiều, có thể bỏ qua bước này và nhập mới qua giao diện.

---

## Xong! Kiểm tra nhanh

- Mở link web → đăng nhập bằng tài khoản admin.
- Vào tab nhập liệu, thử thêm 1 hồ sơ → bấm **Lưu**.
- Bấm **Xem báo cáo** → xem tổng hợp, thử **Xuất Excel**.

Nếu gặp lỗi, xem mục **Hỏi đáp & xử lý sự cố** trong `README.md`.
