-- =====================================================================
--  KT4 · Bước 3/4: PHÂN QUYỀN (Row Level Security)
--
--  Đây là điểm MẠNH so với Google Sheets: luật "ai được xem/sửa hồ sơ nào"
--  nằm NGAY TRONG cơ sở dữ liệu, không thể qua mặt bằng cách mở bảng tính.
--
--  Mô hình (giữ nguyên như hệ thống cũ):
--    - admin / lanhdao      : xem & sửa MỌI hồ sơ
--    - phó phòng (bảng PP)   : xem hồ sơ đoàn mình phụ trách trong đúng giai đoạn
--    - công chức            : chỉ xem/sửa hồ sơ mình có tên trong đoàn
--                             (trưởng đoàn / phó đoàn / thành viên 1..4)
--    - hồ sơ "Hoàn thành"    : chỉ admin được sửa
--    - email không có trong danh sách cán bộ = "khách", không thấy hồ sơ nào
-- =====================================================================

-- ---------------------------------------------------------------------
-- HÀM TRỢ GIÚP (đọc thông tin người đang đăng nhập từ bảng can_bo)
-- ---------------------------------------------------------------------
-- Các hàm này đặt SECURITY DEFINER để tự đọc bảng can_bo mà không kích hoạt
-- lại RLS của chính bảng can_bo (tránh đệ quy chính sách).
create or replace function ten_toi() returns text
language sql stable security definer set search_path = public as $$
  select trim(hoten) from can_bo where lower(email) = lower(auth.email()) limit 1;
$$;

create or replace function co_quyen() returns boolean  -- có tên trong danh sách cán bộ?
language sql stable security definer set search_path = public as $$
  select exists (select 1 from can_bo where lower(email) = lower(auth.email()));
$$;

create or replace function la_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select lower(vaitro) = 'admin' from can_bo where lower(email) = lower(auth.email()) limit 1),
    false);
$$;

create or replace function la_admin_lanhdao() returns boolean  -- xem được tất cả?
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select lower(vaitro) in ('admin','lanhdao') from can_bo where lower(email) = lower(auth.email()) limit 1),
    false);
$$;

-- Người đăng nhập có tên trong đoàn của hồ sơ h không?
create or replace function trong_doan(h ho_so) returns boolean
language sql stable as $$
  select coalesce(ten_toi(),'') <> ''
     and lower(ten_toi()) in (
        lower(coalesce(h.truongdoan,'')), lower(coalesce(h.phodoan,'')),
        lower(coalesce(h.tv1,'')), lower(coalesce(h.tv2,'')),
        lower(coalesce(h.tv3,'')), lower(coalesce(h.tv4,'')));
$$;

-- Phó phòng có được xem hồ sơ h không? (đúng đoàn + đúng giai đoạn phụ trách)
--   Mốc ngày xét: NGÀY QĐKT, nếu trống thì NGÀY ĐỀ XUẤT KT.
create or replace function pp_xem_duoc(h ho_so) returns boolean
language sql stable as $$
  select exists (
    select 1 from phancong_pp p
    where lower(p.email_pp) = lower(auth.email())
      and lower(trim(p.truongdoan)) = lower(trim(coalesce(h.truongdoan,'')))
      and coalesce(h.truongdoan,'') <> ''
      and (
        coalesce(h.ngayqdkt, h.ngaydexuat) is null   -- chưa có ngày -> vẫn cho xem
        or (
          (p.tu_ngay  is null or coalesce(h.ngayqdkt, h.ngaydexuat) >= p.tu_ngay)
          and (p.den_ngay is null or coalesce(h.ngayqdkt, h.ngaydexuat) <= p.den_ngay)
        )
      )
  );
$$;

-- ---------------------------------------------------------------------
-- BẬT RLS TRÊN CÁC BẢNG
-- ---------------------------------------------------------------------
alter table can_bo      enable row level security;
alter table ho_so       enable row level security;
alter table vpdt        enable row level security;
alter table ds_nnt      enable row level security;
alter table phancong_pp enable row level security;
alter table ngay_nghi   enable row level security;

-- ---------------------------------------------------------------------
-- can_bo: mọi cán bộ đăng nhập đều ĐỌC được (để đổ danh sách chọn đoàn);
--         chỉ admin được thêm/sửa/xóa.
-- ---------------------------------------------------------------------
drop policy if exists can_bo_doc   on can_bo;
drop policy if exists can_bo_admin on can_bo;
create policy can_bo_doc   on can_bo for select to authenticated using (true);
create policy can_bo_admin on can_bo for all    to authenticated using (la_admin()) with check (la_admin());

-- ---------------------------------------------------------------------
-- ho_so: XEM theo quyền; THÊM khi mình thuộc đoàn; SỬA khi thuộc đoàn và
--        hồ sơ chưa "Hoàn thành" (admin sửa được mọi trạng thái).
-- ---------------------------------------------------------------------
drop policy if exists ho_so_xem  on ho_so;
drop policy if exists ho_so_them on ho_so;
drop policy if exists ho_so_sua  on ho_so;
drop policy if exists ho_so_xoa  on ho_so;

create policy ho_so_xem on ho_so for select to authenticated
  using ( la_admin_lanhdao() or trong_doan(ho_so) or pp_xem_duoc(ho_so) );

create policy ho_so_them on ho_so for insert to authenticated
  with check ( la_admin_lanhdao() or trong_doan(ho_so) );

create policy ho_so_sua on ho_so for update to authenticated
  using (
    la_admin()
    or ( (la_admin_lanhdao() or trong_doan(ho_so))
         and coalesce(lower(trangthai),'') <> 'hoàn thành' )
  )
  with check ( la_admin_lanhdao() or trong_doan(ho_so) );

create policy ho_so_xoa on ho_so for delete to authenticated
  using ( la_admin() );

-- ---------------------------------------------------------------------
-- vpdt, ds_nnt: mọi người ĐỌC; cán bộ có quyền (không phải khách) được ghi.
-- ---------------------------------------------------------------------
drop policy if exists vpdt_doc  on vpdt;
drop policy if exists vpdt_ghi  on vpdt;
create policy vpdt_doc on vpdt for select to authenticated using (true);
create policy vpdt_ghi on vpdt for all    to authenticated using (co_quyen()) with check (co_quyen());

drop policy if exists nnt_doc on ds_nnt;
drop policy if exists nnt_ghi on ds_nnt;
create policy nnt_doc on ds_nnt for select to authenticated using (true);
create policy nnt_ghi on ds_nnt for all    to authenticated using (co_quyen()) with check (co_quyen());

-- ---------------------------------------------------------------------
-- phancong_pp, ngay_nghi: mọi người ĐỌC; chỉ admin ghi.
-- ---------------------------------------------------------------------
drop policy if exists pp_doc   on phancong_pp;
drop policy if exists pp_admin on phancong_pp;
create policy pp_doc   on phancong_pp for select to authenticated using (true);
create policy pp_admin on phancong_pp for all    to authenticated using (la_admin()) with check (la_admin());

drop policy if exists nghi_doc   on ngay_nghi;
drop policy if exists nghi_admin on ngay_nghi;
create policy nghi_doc   on ngay_nghi for select to authenticated using (true);
create policy nghi_admin on ngay_nghi for all    to authenticated using (la_admin()) with check (la_admin());

-- ---------------------------------------------------------------------
-- RPC: điền bù Số/Ngày văn bản còn thiếu từ kho VPĐT (chỉ ô đang trống).
--   Chạy với quyền của người gọi (RLS vẫn áp dụng) nên chỉ ảnh hưởng
--   những hồ sơ người đó được sửa.
-- ---------------------------------------------------------------------
create or replace function dien_bu_du_lieu_con_thieu()
returns json language plpgsql security invoker as $$
declare so_o int := 0; r int; thieu int := 0;
begin
  -- 5 cặp ID -> (số, ngày). Chỉ điền khi ô đang trống.
  update ho_so h set soqdkt = v.so_phathanh
    from vpdt v where h.id_qdkt = v.id_vanban
    and coalesce(h.soqdkt,'') = '' and coalesce(v.so_phathanh,'') <> '';
  get diagnostics r = row_count; so_o := so_o + r;
  update ho_so h set ngayqdkt = v.ngay_phathanh
    from vpdt v where h.id_qdkt = v.id_vanban and h.ngayqdkt is null and v.ngay_phathanh is not null;
  get diagnostics r = row_count; so_o := so_o + r;

  update ho_so h set sotamhoan = v.so_phathanh
    from vpdt v where h.id_tamhoan = v.id_vanban
    and coalesce(h.sotamhoan,'') = '' and coalesce(v.so_phathanh,'') <> '';
  get diagnostics r = row_count; so_o := so_o + r;
  update ho_so h set ngaytamhoan = v.ngay_phathanh
    from vpdt v where h.id_tamhoan = v.id_vanban and h.ngaytamhoan is null and v.ngay_phathanh is not null;
  get diagnostics r = row_count; so_o := so_o + r;

  update ho_so h set sotamdung = v.so_phathanh
    from vpdt v where h.id_tamdung = v.id_vanban
    and coalesce(h.sotamdung,'') = '' and coalesce(v.so_phathanh,'') <> '';
  get diagnostics r = row_count; so_o := so_o + r;
  update ho_so h set ngaytamdung = v.ngay_phathanh
    from vpdt v where h.id_tamdung = v.id_vanban and h.ngaytamdung is null and v.ngay_phathanh is not null;
  get diagnostics r = row_count; so_o := so_o + r;

  update ho_so h set sogiahan = v.so_phathanh
    from vpdt v where h.id_giahan = v.id_vanban
    and coalesce(h.sogiahan,'') = '' and coalesce(v.so_phathanh,'') <> '';
  get diagnostics r = row_count; so_o := so_o + r;
  update ho_so h set ngaygiahan = v.ngay_phathanh
    from vpdt v where h.id_giahan = v.id_vanban and h.ngaygiahan is null and v.ngay_phathanh is not null;
  get diagnostics r = row_count; so_o := so_o + r;

  update ho_so h set soklkt = v.so_phathanh
    from vpdt v where h.id_klkt = v.id_vanban
    and coalesce(h.soklkt,'') = '' and coalesce(v.so_phathanh,'') <> '';
  get diagnostics r = row_count; so_o := so_o + r;
  update ho_so h set ngayklkt = v.ngay_phathanh
    from vpdt v where h.id_klkt = v.id_vanban and h.ngayklkt is null and v.ngay_phathanh is not null;
  get diagnostics r = row_count; so_o := so_o + r;

  -- Bổ sung MST & tên NNT còn trống (lấy theo ID QĐKT)
  update ho_so h set mst = v.mst
    from vpdt v where h.id_qdkt = v.id_vanban and coalesce(h.mst,'') = '' and coalesce(v.mst,'') <> '';
  get diagnostics r = row_count; so_o := so_o + r;
  update ho_so h set tencty = v.ten_nnt
    from vpdt v where h.id_qdkt = v.id_vanban and coalesce(h.tencty,'') = '' and coalesce(v.ten_nnt,'') <> '';
  get diagnostics r = row_count; so_o := so_o + r;

  -- Đếm số ID còn tham chiếu nhưng chưa có trong kho VPĐT
  select count(*) into thieu from (
    select unnest(array[id_qdkt,id_tamhoan,id_tamdung,id_giahan,id_klkt]) id
    from ho_so
  ) x where coalesce(x.id,'') <> '' and not exists (select 1 from vpdt v where v.id_vanban = x.id);

  return json_build_object(
    'ok', true, 'soODien', so_o, 'thieu', thieu,
    'msg', case when so_o > 0
                then 'Đã điền bù ' || so_o || ' ô.' ||
                     case when thieu > 0 then ' Còn ' || thieu || ' ID chưa có trong kho VPĐT.' else '' end
                else 'Không có ô nào cần điền bù (dữ liệu đã đầy đủ).' end
  );
end;
$$;
