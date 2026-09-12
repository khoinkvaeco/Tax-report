-- =====================================================================
--  KT4 · HỆ THỐNG NHẬP LIỆU & BÁO CÁO KIỂM TRA THUẾ
--  Bước 1/4: TẠO BẢNG (chạy trên Supabase → SQL Editor)
--
--  Chuyển từ Google Sheets sang PostgreSQL. Mỗi "sheet" cũ thành 1 bảng,
--  mỗi cột có KIỂU DỮ LIỆU rõ ràng nên KHÔNG còn lỗi lệch cột / mất số 0.
--    - Cột chữ (text): MST, ID, số văn bản  -> giữ nguyên số 0 đầu
--    - Cột tiền (bigint): các khoản truy thu/phạt  -> cộng trừ chính xác
--    - Cột ngày (date): so sánh, lọc theo thời gian chính xác
--
--  Cách chạy: mở project trên supabase.com > SQL Editor > New query >
--  dán TOÀN BỘ file này > Run. Sau đó chạy tiếp 02, 03, 04.
-- =====================================================================

-- Xóa bảng cũ nếu chạy lại (an toàn khi cài mới; KHÔNG chạy lại nếu đã có dữ liệu)
-- drop table if exists ho_so, can_bo, vpdt, ds_nnt, phancong_pp, ngay_nghi cascade;

-- ---------------------------------------------------------------------
-- 1) CÁN BỘ + PHÂN QUYỀN  (tương ứng sheet "ds KT4")
--    vaitro: 'admin' | 'lanhdao' | 'congchuc'
--    Email phải TRÙNG với email đăng nhập (tài khoản Supabase Auth).
-- ---------------------------------------------------------------------
create table if not exists can_bo (
  id     bigint generated always as identity primary key,
  stt    int,
  hoten  text not null,
  email  text unique,
  vaitro text not null default 'congchuc'
         check (vaitro in ('admin','lanhdao','congchuc')),
  created_at timestamptz not null default now()
);
comment on table can_bo is 'Danh sách cán bộ KT4 và phân quyền theo email';

-- ---------------------------------------------------------------------
-- 2) HỒ SƠ KIỂM TRA  (tương ứng sheet "DATA") — bảng chính
--    Tên cột trùng "key" trong cấu hình COLUMNS ở giao diện web.
-- ---------------------------------------------------------------------
create table if not exists ho_so (
  id            bigint generated always as identity primary key,

  -- Thông tin chung
  loaitab       text,                 -- QT | TH | SH (loại hồ sơ / tab)
  mst           text,                 -- giữ số 0 đầu
  tencty        text,
  truongdoan    text,
  phodoan       text,
  tv1 text, tv2 text, tv3 text, tv4 text,
  loaihinh      text,
  loaikh        text,
  chuyende      text,
  kykt          text,
  kyhoan        text,
  kyhoan_sh     text,
  ngaydexuat    date,
  so_qhs        text,
  so_vb_dnh     text,
  ngay_dnh      date,
  mathang_xk    text,
  nuoc_xk       text,

  -- ID (VPĐT) — cán bộ nhập ID, hệ thống tra kho VPĐT
  id_qdkt text, id_tamhoan text, id_tamdung text, id_giahan text, id_klkt text,

  -- Số & ngày văn bản (tự điền khi tra ID)
  soqdkt text,     ngayqdkt date,
  sotamhoan text,  ngaytamhoan date,
  sotamdung text,  ngaytamdung date,
  sogiahan text,   ngaygiahan date,
  soklkt text,     ngayklkt date,

  -- Ngày biên bản, lý do quá thời gian
  ngaybbcbqdkt date,
  ngaybbkt date,
  ngaybbcbbbkt date,
  ngaybaocao date,
  songayquahan int,                    -- TỰ TÍNH (trigger) — số ngày làm việc quá hạn
  lydoquahan text,

  -- Phạt, truy thu, chậm nộp (đơn vị: đồng, số nguyên)
  tt_gtgt bigint, tt_tndn bigint, tt_tncn bigint, tt_nhathau bigint, tt_khac bigint,
  phat_thutuc bigint, phat_khaisai bigint, phat_tronthue bigint, phat_khac bigint,
  tienchamnop bigint,
  tongcong bigint,                     -- TỰ TÍNH (trigger)
  giamkhautru bigint,
  giamlo bigint,
  quydoigiamlo bigint,                 -- TỰ TÍNH (trigger)
  th_gtgt bigint,                      -- truy hoàn GTGT (tab Sau hoàn)

  -- Xử lý hồ sơ hoàn (tab Trước hoàn)
  thue_dnh bigint, thue_duochoan bigint, thue_khonghoan bigint, thue_chuyenkt bigint,
  so_qdhoan text,       ngay_qdhoan date,
  so_tbkhonghoan text,  ngay_tbkhonghoan date,
  so_lenhhoan text,     ngay_lenhhoan date,

  -- Báo cáo
  danop bigint,
  nhap_ttr text,
  nhap_tms text,
  trangthai text,                      -- 'Đang thực hiện' | 'Hoàn thành'

  -- Hệ thống
  nguoinhap   text,                    -- email người nhập (trigger tự ghi)
  ngaycapnhat timestamptz,             -- (trigger tự ghi)
  created_at  timestamptz not null default now()
);
comment on table ho_so is 'Hồ sơ kiểm tra thuế — mỗi dòng 1 hồ sơ';

-- Chỉ mục giúp lọc/tra nhanh khi dữ liệu lớn
create index if not exists idx_ho_so_mst        on ho_so (mst);
create index if not exists idx_ho_so_truongdoan on ho_so (truongdoan);
create index if not exists idx_ho_so_ngayqdkt   on ho_so (ngayqdkt);
create index if not exists idx_ho_so_trangthai  on ho_so (trangthai);

-- ---------------------------------------------------------------------
-- 3) KHO VPĐT  (tương ứng sheet "VPDT_IMPORT")
-- ---------------------------------------------------------------------
create table if not exists vpdt (
  id_vanban    text primary key,       -- ID văn bản (khóa chính)
  so_phathanh  text,
  ngay_phathanh date,
  loai_vb      text,
  trich_yeu    text,
  mst          text,
  ten_nnt      text,
  updated_at   timestamptz not null default now()
);
comment on table vpdt is 'Kho văn bản VPĐT import từ file export';

-- ---------------------------------------------------------------------
-- 4) DANH SÁCH TÊN NNT theo MST  (tương ứng sheet "ds NNT")
-- ---------------------------------------------------------------------
create table if not exists ds_nnt (
  mst     text primary key,
  ten_nnt text
);
comment on table ds_nnt is 'Tra Tên NNT theo MST để tự điền khi nhập';

-- ---------------------------------------------------------------------
-- 5) PHÂN CÔNG PHÓ PHÒNG theo giai đoạn  (tương ứng sheet "PHANCONG_PP")
--    Phó phòng xem được hồ sơ của đoàn mình phụ trách trong đúng khoảng thời gian.
-- ---------------------------------------------------------------------
create table if not exists phancong_pp (
  id         bigint generated always as identity primary key,
  email_pp   text not null,
  hoten_pp   text,
  truongdoan text not null,            -- tên trưởng đoàn được phụ trách
  tu_ngay    date,
  den_ngay   date                      -- trống = đến nay
);
comment on table phancong_pp is 'Phó phòng phụ trách đoàn theo từng giai đoạn';

-- ---------------------------------------------------------------------
-- 6) NGÀY NGHỈ LỄ  (phục vụ tính số ngày quá hạn theo NGÀY LÀM VIỆC)
--    Thứ 7, CN và 4 ngày lễ cố định (01/01, 30/04, 01/05, 02/09) đã xử lý
--    trong hàm; bảng này chỉ chứa ngày nghỉ ĐẶC BIỆT (Tết âm lịch, nghỉ bù…).
-- ---------------------------------------------------------------------
create table if not exists ngay_nghi (
  ngay  date primary key,
  mo_ta text
);
comment on table ngay_nghi is 'Ngày nghỉ lễ đặc biệt (Tết, nghỉ bù) — bổ sung mỗi năm';
