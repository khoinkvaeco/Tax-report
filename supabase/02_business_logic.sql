-- =====================================================================
--  KT4 · Bước 2/4: LOGIC NGHIỆP VỤ (hàm + trigger tự tính)
--
--  Chuyển các hàm tính toán từ Code.gs sang PostgreSQL. Ưu điểm: mọi hồ sơ
--  đều được tính GIỐNG NHAU ngay trong cơ sở dữ liệu, không phụ thuộc giao diện.
--    - Tổng cộng truy thu & phạt & chậm nộp
--    - Quy đổi giảm lỗ = Giảm khấu trừ + (Giảm lỗ × 20%)
--    - Số ngày quá hạn lập BBKT (5 ngày làm việc kể từ BBCB QĐKT)
-- =====================================================================

-- ---- Có phải ngày nghỉ (T7, CN, lễ cố định, hoặc ngày nghỉ đặc biệt) ----
create or replace function la_ngay_nghi(d date) returns boolean
language sql stable as $$
  select
    extract(dow from d) in (0,6)                       -- 0=CN, 6=T7
    or to_char(d,'DD/MM') in ('01/01','30/04','01/05','02/09')  -- lễ cố định
    or exists (select 1 from ngay_nghi n where n.ngay = d);      -- Tết, nghỉ bù
$$;

-- ---- Cộng thêm N ngày LÀM VIỆC vào một ngày ----
create or replace function cong_ngay_lam_viec(bd date, n int) returns date
language plpgsql stable as $$
declare kq date := bd; dem int := 0;
begin
  while dem < n loop
    kq := kq + 1;
    if not la_ngay_nghi(kq) then dem := dem + 1; end if;
  end loop;
  return kq;
end;
$$;

-- ---- Đếm số ngày LÀM VIỆC từ a đến b (không tính ngày a) ----
create or replace function dem_ngay_lam_viec(a date, b date) returns int
language plpgsql stable as $$
declare dem int := 0; t date;
begin
  if a is null or b is null or b <= a then return 0; end if;
  t := a;
  while t < b loop
    t := t + 1;
    if not la_ngay_nghi(t) then dem := dem + 1; end if;
  end loop;
  return dem;
end;
$$;

-- ---- Số ngày làm việc quá hạn lập BBKT ----
--   NULL = thiếu dữ liệu (chưa tính được);  0 = đúng hạn;  >0 = số ngày quá hạn
create or replace function so_ngay_qua_han(bbcb date, bbkt date) returns int
language plpgsql stable as $$
declare hanchot date;
begin
  if bbcb is null or bbkt is null then return null; end if;
  hanchot := cong_ngay_lam_viec(bbcb, 5);   -- hạn = BBCB QĐKT + 5 ngày làm việc
  if bbkt <= hanchot then return 0; end if;
  return dem_ngay_lam_viec(hanchot, bbkt);
end;
$$;

-- ---- Trigger: tự tính các cột auto khi thêm/sửa hồ sơ ----
--   Đây là "nguồn sự thật" duy nhất — giao diện không cần tự tính lại.
create or replace function ho_so_truoc_khi_ghi() returns trigger
language plpgsql as $$
begin
  -- Tổng cộng truy thu & phạt & tiền chậm nộp (khớp applyAutoCalc_ ở backend cũ)
  new.tongcong :=
      coalesce(new.tt_gtgt,0)   + coalesce(new.tt_tndn,0)   + coalesce(new.tt_tncn,0)
    + coalesce(new.tt_nhathau,0)+ coalesce(new.tt_khac,0)
    + coalesce(new.phat_thutuc,0) + coalesce(new.phat_khaisai,0)
    + coalesce(new.phat_tronthue,0) + coalesce(new.phat_khac,0)
    + coalesce(new.tienchamnop,0);

  -- Quy đổi giảm lỗ = Giảm khấu trừ + (Giảm lỗ × 20%)
  new.quydoigiamlo := coalesce(new.giamkhautru,0) + round(coalesce(new.giamlo,0) * 0.20);

  -- Số ngày quá hạn
  new.songayquahan := so_ngay_qua_han(new.ngaybbcbqdkt, new.ngaybbkt);

  -- Ghi nhận người nhập & thời điểm cập nhật
  new.nguoinhap   := coalesce(auth.email(), new.nguoinhap);
  new.ngaycapnhat := now();

  return new;
end;
$$;

drop trigger if exists trg_ho_so_tinh_toan on ho_so;
create trigger trg_ho_so_tinh_toan
  before insert or update on ho_so
  for each row execute function ho_so_truoc_khi_ghi();
