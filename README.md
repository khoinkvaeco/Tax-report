# KT4 · Hệ thống Nhập liệu & Báo cáo Kiểm tra thuế (bản Supabase)

Bản chuyển đổi từ **Google Apps Script + Google Sheets** sang **Supabase
(PostgreSQL)** + trang web tĩnh. Giữ nguyên nghiệp vụ và giao diện cũ, nhưng
khắc phục các hạn chế của Apps Script:

| Vấn đề của bản Google Sheets cũ | Bản Supabase này |
|---|---|
| Lệch cột, lệch dòng, mất số 0 đầu của MST | Cột có **kiểu dữ liệu** rõ ràng — không còn lỗi này |
| Ghi đè khi 2 người lưu cùng lúc | PostgreSQL có **giao dịch (transaction)** an toàn |
| Chậm khi nhiều hồ sơ, đọc cả bảng mỗi lần | Có **chỉ mục (index)**, truy vấn nhanh |
| Phân quyền chỉ ở tầng ứng dụng | **Row Level Security** ngay trong CSDL, không qua mặt được |
| Hạn ngạch chạy 6 phút, phải tạo file trên Drive để tải | Không giới hạn kiểu đó; xuất Excel tải thẳng về máy |

> ⚠️ **Lưu ý về dữ liệu ngành thuế:** gói Supabase miễn phí đặt máy chủ ở
> nước ngoài. Về kỹ thuật là an toàn (mã hóa + RLS), nhưng dữ liệu thật đầy đủ
> của ngành thuế nên được thống nhất với bộ phận CNTT của Cục về nơi lưu trữ.
> Xem thảo luận trong tài liệu tư vấn kèm theo.

## Cấu trúc dự án

```
supabase/
  01_schema.sql          Tạo bảng (can_bo, ho_so, vpdt, ds_nnt, phancong_pp, ngay_nghi)
  02_business_logic.sql  Hàm + trigger tự tính (tổng cộng, quy đổi giảm lỗ, ngày quá hạn)
  03_phan_quyen_rls.sql  Phân quyền Row Level Security + RPC điền bù dữ liệu
  04_seed.sql            Nạp 28 cán bộ + ngày nghỉ lễ
web/
  index.html             Giao diện (đăng nhập + nhập liệu + báo cáo)
  import.html            Trang chuyển & nạp dữ liệu cũ từ Google Sheets sang Supabase
  config.js              ⚙️ 2 giá trị cần điền: URL và khóa anon của Supabase
  app.js                 Kết nối Supabase + lớp thay các hàm backend cũ
  ui.js                  Toàn bộ logic giao diện (chuyển từ NhapLieu_5.html)
HUONG_DAN_CAI_DAT.md     Hướng dẫn cài đặt từng bước cho người không rành IT
```

## Cài đặt

Xem chi tiết trong **[HUONG_DAN_CAI_DAT.md](HUONG_DAN_CAI_DAT.md)**. Tóm tắt:

1. Tạo dự án trên supabase.com (region Singapore).
2. Chạy lần lượt 4 file trong `supabase/` bằng SQL Editor.
3. Tạo tài khoản đăng nhập cho cán bộ (Authentication → Users).
4. Điền email + vai trò vào bảng `can_bo` (Table Editor).
5. Điền `web/config.js` (URL + khóa anon).
6. Đưa thư mục `web/` lên Netlify Drop (hoặc host tĩnh khác).

## Phân quyền (giống hệ thống cũ)

- `admin` / `lanhdao`: xem & sửa **mọi** hồ sơ.
- `congchuc`: chỉ xem/sửa hồ sơ mình là trưởng đoàn / phó đoàn / thành viên.
- Phó phòng (bảng `phancong_pp`): xem hồ sơ đoàn phụ trách trong đúng giai đoạn.
- Hồ sơ **"Hoàn thành"**: chỉ `admin` sửa được.

## Hỏi đáp & xử lý sự cố

- **Đăng nhập báo lỗi "Invalid login credentials":** kiểm tra đã tạo user ở
  Authentication chưa; đúng email/mật khẩu chưa.
- **Đăng nhập xong không thấy hồ sơ / báo "chưa được cấp quyền":** email đăng
  nhập chưa có trong bảng `can_bo`, hoặc `vaitro` để trống. Điền lại ở Table Editor.
- **Không lưu được hồ sơ:** thường do bạn không có tên trong đoàn của hồ sơ đó,
  hoặc hồ sơ đã "Hoàn thành" (chỉ admin sửa).
- **Trang trắng / không chạy:** kiểm tra đã điền đúng `SUPABASE_URL` và
  `SUPABASE_ANON_KEY` trong `config.js` chưa; mở Console trình duyệt (F12) xem lỗi.
- **Đăng nhập bị chuyển hướng lạ:** thêm địa chỉ web vào Supabase →
  Authentication → URL Configuration.

## Ghi chú kỹ thuật

- Công thức "Tổng cộng" do trigger cơ sở dữ liệu tính (nguồn sự thật duy nhất),
  gồm các khoản truy thu + phạt + tiền chậm nộp (không gồm Truy hoàn GTGT), đúng
  như hàm `applyAutoCalc_` của backend cũ.
- Số ngày quá hạn tính theo **ngày làm việc** (trừ T7/CN và ngày lễ trong bảng
  `ngay_nghi` + 4 ngày lễ cố định). Cập nhật lịch nghỉ Tết mỗi năm trong bảng đó.
- MST, ID, số văn bản lưu dạng **text** nên không bao giờ mất số 0 đầu.
