-- =====================================================================
--  KT4 · Bước 4/4: DỮ LIỆU BAN ĐẦU
--
--  - Nạp sẵn 28 cán bộ (email để TRỐNG, admin điền sau).
--  - Nạp ngày nghỉ lễ đặc biệt (Tết, nghỉ bù) để tính số ngày quá hạn.
--
--  ⚠️ SAU KHI CHẠY: mở bảng can_bo (Table Editor) và điền EMAIL cho từng
--     cán bộ — email này phải TRÙNG với email tài khoản đăng nhập (Auth).
--     Đặt vaitro = 'admin' cho ít nhất 1 người quản trị.
-- =====================================================================

-- ---- 28 cán bộ KT4 (người đầu tiên tạm để admin, còn lại congchuc) ----
insert into can_bo (stt, hoten, email, vaitro) values
  (1 ,'Bùi Đình Phùng'        , null, 'admin'),
  (2 ,'Chu Thị Lành'          , null, 'congchuc'),
  (3 ,'Đào Tiên Giang'        , null, 'congchuc'),
  (4 ,'Đào Thị Tuyết Mai'     , null, 'congchuc'),
  (5 ,'Đinh Thị Hồng Khang'   , null, 'congchuc'),
  (6 ,'Đỗ Thị Quyên'          , null, 'congchuc'),
  (7 ,'Hà Thụy Hiền'          , null, 'congchuc'),
  (8 ,'Hoàng Thị Thu Hà'      , null, 'congchuc'),
  (9 ,'Lê Khắc Thúy Nga'      , null, 'congchuc'),
  (10,'Lê Ngọc Xuân'          , null, 'congchuc'),
  (11,'Lê Thị Hoài Phương'    , null, 'congchuc'),
  (12,'Ngô Văn Hiệu'          , null, 'congchuc'),
  (13,'Nguyễn Hùng Dương'     , null, 'congchuc'),
  (14,'Nguyễn Ngọc Thanh'     , null, 'congchuc'),
  (15,'Nguyễn Nhật Nguyên'    , null, 'congchuc'),
  (16,'Nguyễn Thành Nguyên'   , null, 'congchuc'),
  (17,'Nguyễn Thanh Tùng'     , null, 'congchuc'),
  (18,'Nguyễn Thị Dạ Thảo'    , null, 'congchuc'),
  (19,'Nguyễn Thị Hòa'        , null, 'congchuc'),
  (20,'Nguyễn Thị Mỹ Bình'    , null, 'congchuc'),
  (21,'Nguyễn Thị Ngân'       , null, 'congchuc'),
  (22,'Nguyễn Thị Xuân Kiều'  , null, 'congchuc'),
  (23,'Nguyễn Văn Nam'        , null, 'congchuc'),
  (24,'Phạm Đức Thắng'        , null, 'congchuc'),
  (25,'Phạm Tấn Phát'         , null, 'congchuc'),
  (26,'Phạm Thị Hường'        , null, 'congchuc'),
  (27,'Trần Văn Cường'        , null, 'congchuc'),
  (28,'Trịnh Thị Tình'        , null, 'congchuc')
on conflict do nothing;

-- ---- Ngày nghỉ lễ đặc biệt (bổ sung mỗi năm khi có lịch mới) ----
insert into ngay_nghi (ngay, mo_ta) values
  ('2026-02-14','Tết Bính Ngọ'), ('2026-02-15','Tết Bính Ngọ'),
  ('2026-02-16','Tết Bính Ngọ'), ('2026-02-17','Tết Bính Ngọ'),
  ('2026-02-18','Tết Bính Ngọ'), ('2026-02-19','Tết Bính Ngọ'),
  ('2026-02-20','Tết Bính Ngọ'),
  ('2026-04-26','Giỗ Tổ Hùng Vương'),
  ('2026-05-02','Nghỉ bù 30/4 - 1/5'),
  ('2026-09-01','Quốc khánh nghỉ thêm'), ('2026-09-03','Quốc khánh nghỉ thêm')
on conflict do nothing;
