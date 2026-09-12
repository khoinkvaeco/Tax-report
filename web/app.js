/* =====================================================================
 *  KT4 · Nhập liệu & Báo cáo kiểm tra thuế — bản chạy trên Supabase
 *
 *  File này thay cho "Code.gs" (backend Google Apps Script cũ):
 *   - Kết nối Supabase (PostgreSQL) thay cho Google Sheets
 *   - Lớp SERVER.* mô phỏng đúng các hàm backend cũ (getConfig, getRecords,
 *     saveRecord, getReportSummary, lookupAllIds, …) nên phần giao diện
 *     bên dưới gần như giữ nguyên.
 *   - Phân quyền do RLS trong cơ sở dữ liệu lo (xem 03_phan_quyen_rls.sql).
 * ===================================================================== */

/* ====================== A. KẾT NỐI & CẤU HÌNH ====================== */
var SB = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
var VPDT_URL_BASE = window.VPDT_URL_BASE || '';
var TY_LE_QUY_DOI_GIAM_LO = 0.20;

// Trạng thái toàn cục
var USER = {email:'', hoten:'', vaitro:'guest'};
var CANBO = [];        // danh sách tên cán bộ (đổ vào ô chọn đoàn)
var COLUMNS_PUB = [];  // cấu hình cột gửi cho giao diện

// Danh sách cột theo KIỂU dữ liệu trong cơ sở dữ liệu (để chuyển đổi qua lại)
var DATE_COLS = ['ngaydexuat','ngay_dnh','ngayqdkt','ngaytamhoan','ngaytamdung',
  'ngaygiahan','ngayklkt','ngaybbcbqdkt','ngaybbkt','ngaybbcbbbkt','ngaybaocao',
  'ngay_qdhoan','ngay_tbkhonghoan','ngay_lenhhoan'];
var MONEY_COLS = ['tt_gtgt','tt_tndn','tt_tncn','tt_nhathau','tt_khac','phat_thutuc',
  'phat_khaisai','phat_tronthue','phat_khac','tienchamnop','tongcong','giamkhautru',
  'giamlo','quydoigiamlo','th_gtgt','thue_dnh','thue_duochoan','thue_khonghoan',
  'thue_chuyenkt','danop'];
// Cột do cơ sở dữ liệu tự tính — KHÔNG gửi lên khi lưu (trigger tự điền)
var AUTO_COLS = ['tongcong','quydoigiamlo','songayquahan','nguoinhap','ngaycapnhat'];

/* Cấu hình cột — giống hệt COLUMNS trong Code.gs. */
var COLUMNS = [
  {key:'loaitab', label:'LOẠI HỒ SƠ', type:'auto', group:'Thông tin chung'},
  {key:'mst', label:'MST', type:'nhap', group:'Thông tin chung'},
  {key:'tencty', label:'TÊN NNT', type:'nhap', group:'Thông tin chung'},
  {key:'truongdoan', label:'TRƯỞNG ĐOÀN', type:'box', group:'Thông tin chung'},
  {key:'phodoan', label:'PHÓ ĐOÀN', type:'box', group:'Thông tin chung'},
  {key:'tv1', label:'THÀNH VIÊN 1', type:'box', group:'Thông tin chung'},
  {key:'tv2', label:'THÀNH VIÊN 2', type:'box', group:'Thông tin chung'},
  {key:'tv3', label:'THÀNH VIÊN 3', type:'box', group:'Thông tin chung'},
  {key:'tv4', label:'THÀNH VIÊN 4', type:'box', group:'Thông tin chung'},
  {tabs:['QT'], key:'loaihinh', label:'LOẠI HÌNH KIỂM TRA', type:'box', group:'Thông tin chung',
      options:['Quyết toán','Giải thể','Chuyển địa điểm','Chia tách-sáp nhập','Thanh tra']},
  {tabs:['QT'], key:'loaikh', label:'LOẠI KẾ HOẠCH', type:'box', group:'Thông tin chung',
      options:['Chuyên đề','Kế hoạch năm','Kế hoạch đột xuất','Kế hoạch năm tồn']},
  {tabs:['QT'], key:'chuyende', label:'TÊN CHUYÊN ĐỀ', type:'box', group:'Thông tin chung',
      options:['Thương mại điện tử','Bất động sản','DN kinh doanh vàng bạc đá quý','DN có hoạt động xây dựng, xây lắp','DN xuất khẩu dầu ăn, dầu đã qua sử dụng','DN có hoạt động BOT','Hoạt động cho vay và KD trò chơi điện tử, hoạt động sx game','DN thua lỗ nhiều năm','DN hoạt động kinh doanh ô tô, xe máy','DN hoạt động kinh doanh bảo hiểm','DN kinh doanh thuốc lá','DN có doanh thu tăng trưởng đột biến','DN phát hành cổ phiếu theo chương trình cho nlđ','DN có kinh doanh dịch vụ golf','Giao dịch liên kết','DN hoạt động cung ứng lao động','DN kinh doanh hoạt động xăng dầu','DN kinh doanh sắt, thép, phế liệu','Giáo dục','Hóa đơn rủi ro','Lãi mỏng','Khác']},
  {tabs:['QT'], key:'kykt', label:'KỲ KIỂM TRA', type:'nhap', group:'Thông tin chung'},
  {tabs:['TH'], key:'kyhoan', label:'KỲ HOÀN', type:'nhap', group:'Thông tin chung'},
  {tabs:['SH'], key:'kyhoan_sh', label:'KỲ HOÀN (nhiều kỳ, cách nhau dấu ;)', type:'nhap', group:'Thông tin chung'},
  {key:'ngaydexuat', label:'NGÀY ĐỀ XUẤT KT', type:'date', group:'Thông tin chung'},

  {key:'so_qhs', label:'SỐ QHS', type:'nhap', group:'Thông tin chung', tabs:['TH']},
  {key:'so_vb_dnh', label:'SỐ VĂN BẢN ĐỀ NGHỊ HOÀN', type:'nhap', group:'Thông tin chung', tabs:['TH']},
  {key:'ngay_dnh', label:'NGÀY ĐỀ NGHỊ HOÀN', type:'date', group:'Thông tin chung', tabs:['TH']},
  {key:'mathang_xk', label:'MẶT HÀNG XUẤT KHẨU', type:'nhap', group:'Thông tin chung', tabs:['TH']},
  {key:'nuoc_xk', label:'NƯỚC XUẤT KHẨU', type:'nhap', group:'Thông tin chung', tabs:['TH']},

  {key:'id_qdkt', label:'ID QĐKT', type:'idlookup', group:'ID (VPĐT)', fillSo:'soqdkt', fillNgay:'ngayqdkt'},
  {key:'id_tamhoan', label:'ID TB TẠM HOÃN', type:'idlookup', group:'ID (VPĐT)', fillSo:'sotamhoan', fillNgay:'ngaytamhoan'},
  {key:'id_tamdung', label:'ID TB TẠM DỪNG', type:'idlookup', group:'ID (VPĐT)', fillSo:'sotamdung', fillNgay:'ngaytamdung'},
  {key:'id_giahan', label:'ID TB GIA HẠN', type:'idlookup', group:'ID (VPĐT)', fillSo:'sogiahan', fillNgay:'ngaygiahan'},
  {key:'id_klkt', label:'ID KLKT/ADKPHQ/QĐXL/THH', type:'idlookup', group:'ID (VPĐT)', fillSo:'soklkt', fillNgay:'ngayklkt'},

  {key:'soqdkt', label:'SỐ QĐKT', type:'auto', group:'Số & ngày văn bản'},
  {key:'ngayqdkt', label:'NGÀY QĐKT', type:'auto', group:'Số & ngày văn bản'},
  {key:'sotamhoan', label:'SỐ TB TẠM HOÃN', type:'auto', group:'Số & ngày văn bản'},
  {key:'ngaytamhoan', label:'NGÀY TB TẠM HOÃN', type:'auto', group:'Số & ngày văn bản'},
  {key:'sotamdung', label:'SỐ TB TẠM DỪNG', type:'auto', group:'Số & ngày văn bản'},
  {key:'ngaytamdung', label:'NGÀY TB TẠM DỪNG', type:'auto', group:'Số & ngày văn bản'},
  {key:'sogiahan', label:'SỐ TB GIA HẠN', type:'auto', group:'Số & ngày văn bản'},
  {key:'ngaygiahan', label:'NGÀY TB GIA HẠN', type:'auto', group:'Số & ngày văn bản'},
  {key:'soklkt', label:'SỐ KLKT/ADKPHQ/QĐXL/THH', type:'auto', group:'Số & ngày văn bản'},
  {key:'ngayklkt', label:'NGÀY KLKT/ADKPHQ/QĐXL/THH', type:'auto', group:'Số & ngày văn bản'},

  {key:'ngaybbcbqdkt', label:'NGÀY BBCB QĐKT', type:'date', group:'Ngày biên bản, lý do quá thời gian'},
  {key:'ngaybbkt', label:'NGÀY BBKT', type:'date', group:'Ngày biên bản, lý do quá thời gian'},
  {key:'ngaybbcbbbkt', label:'NGÀY BBCB BBKT', type:'date', group:'Ngày biên bản, lý do quá thời gian'},
  {key:'ngaybaocao', label:'NGÀY BÁO CÁO KT', type:'date', group:'Ngày biên bản, lý do quá thời gian'},
  {key:'songayquahan', label:'SỐ NGÀY QUÁ HẠN', type:'autocalc', group:'Ngày biên bản, lý do quá thời gian'},
  {key:'lydoquahan', label:'Lý do quá thời gian', type:'nhap', group:'Ngày biên bản, lý do quá thời gian'},

  {tabs:['QT'], key:'tt_gtgt', label:'Truy thu GTGT', type:'money', group:'Phạt, truy thu, chậm nộp'},
  {tabs:['QT'], key:'tt_tndn', label:'Truy thu TNDN', type:'money', group:'Phạt, truy thu, chậm nộp'},
  {tabs:['QT'], key:'tt_tncn', label:'Truy thu TNCN', type:'money', group:'Phạt, truy thu, chậm nộp'},
  {tabs:['QT'], key:'tt_nhathau', label:'Truy thu thuế nhà thầu', type:'money', group:'Phạt, truy thu, chậm nộp'},
  {tabs:['QT'], key:'tt_khac', label:'Truy thu khác', type:'money', group:'Phạt, truy thu, chậm nộp'},
  {tabs:['QT','SH'], key:'phat_thutuc', label:'Phạt thủ tục', type:'money', group:'Phạt, truy thu, chậm nộp'},
  {tabs:['QT','SH'], key:'phat_khaisai', label:'Phạt khai sai', type:'money', group:'Phạt, truy thu, chậm nộp'},
  {tabs:['QT','SH'], key:'phat_tronthue', label:'Phạt trốn thuế', type:'money', group:'Phạt, truy thu, chậm nộp'},
  {tabs:['QT','SH'], key:'phat_khac', label:'Phạt khác', type:'money', group:'Phạt, truy thu, chậm nộp'},
  {tabs:['QT','SH'], key:'tienchamnop', label:'TIỀN CHẬM NỘP', type:'money', group:'Phạt, truy thu, chậm nộp'},
  {tabs:['QT','SH'], key:'tongcong', label:'Tổng cộng truy thu & phạt & tiền chậm nộp', type:'autocalc', group:'Phạt, truy thu, chậm nộp'},
  {tabs:['QT'], key:'giamkhautru', label:'Giảm khấu trừ', type:'money', group:'Phạt, truy thu, chậm nộp'},
  {tabs:['QT'], key:'giamlo', label:'Giảm lỗ', type:'money', group:'Phạt, truy thu, chậm nộp'},
  {tabs:['QT'], key:'quydoigiamlo', label:'QUY ĐỔI GIẢM LỖ', type:'autocalc', group:'Phạt, truy thu, chậm nộp'},

  {tabs:['SH'], key:'th_gtgt', label:'Truy hoàn GTGT', type:'money', group:'Phạt, truy thu, chậm nộp'},

  {tabs:['TH'], key:'thue_dnh', label:'Số thuế đề nghị hoàn', type:'money', group:'Xử lý hồ sơ hoàn'},
  {tabs:['TH'], key:'thue_duochoan', label:'Số thuế được hoàn', type:'money', group:'Xử lý hồ sơ hoàn'},
  {tabs:['TH'], key:'thue_khonghoan', label:'Số thuế không hoàn', type:'money', group:'Xử lý hồ sơ hoàn'},
  {tabs:['TH'], key:'thue_chuyenkt', label:'Số thuế chuyển khấu trừ kỳ sau', type:'money', group:'Xử lý hồ sơ hoàn'},
  {tabs:['TH'], key:'so_qdhoan', label:'Số Quyết định hoàn thuế', type:'nhap', group:'Xử lý hồ sơ hoàn'},
  {tabs:['TH'], key:'ngay_qdhoan', label:'Ngày Quyết định hoàn thuế', type:'date', group:'Xử lý hồ sơ hoàn'},
  {tabs:['TH'], key:'so_tbkhonghoan', label:'Số Thông báo không hoàn', type:'nhap', group:'Xử lý hồ sơ hoàn'},
  {tabs:['TH'], key:'ngay_tbkhonghoan', label:'Ngày Thông báo không hoàn', type:'date', group:'Xử lý hồ sơ hoàn'},
  {tabs:['TH'], key:'so_lenhhoan', label:'Số lệnh hoàn', type:'nhap', group:'Xử lý hồ sơ hoàn'},
  {tabs:['TH'], key:'ngay_lenhhoan', label:'Ngày lệnh hoàn', type:'date', group:'Xử lý hồ sơ hoàn'},

  {key:'danop', label:'SỐ TIỀN ĐÃ NỘP NSNN', type:'money', group:'Báo cáo'},
  {key:'nhap_ttr', label:'NHẬP TTR (x)', type:'box', group:'Báo cáo', options:['x']},
  {key:'nhap_tms', label:'NHẬP TMS (x)', type:'box', group:'Báo cáo', options:['x']},
  {key:'trangthai', label:'TRẠNG THÁI', type:'box', group:'Báo cáo', options:['Đang thực hiện','Hoàn thành']},

  {key:'_nguoinhap', label:'Người nhập (email)', type:'sys', group:'_'},
  {key:'_ngaycapnhat', label:'Ngày cập nhật', type:'sys', group:'_'}
];

/* ====================== B. HÀM TRỢ GIÚP CHUNG ====================== */
function pad2(x){ x=String(x); return x.length<2?('0'+x):x; }

// Chuẩn hóa ngày về dd/MM/yyyy (nhận 'YYYY-MM-DD', Date, hoặc dd/MM/yyyy)
function normDateVN(v){
  if(v==null || v==='') return '';
  if(v instanceof Date){
    return pad2(v.getDate())+'/'+pad2(v.getMonth()+1)+'/'+v.getFullYear();
  }
  var s=String(v).trim();
  var iso=s.match(/^(\d{4})-(\d{2})-(\d{2})/);           // YYYY-MM-DD
  if(iso) return iso[3]+'/'+iso[2]+'/'+iso[1];
  var vn=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);      // d/m/yyyy
  if(vn) return pad2(vn[1])+'/'+pad2(vn[2])+'/'+vn[3];
  return s;
}
// dd/MM/yyyy -> YYYY-MM-DD (cho cơ sở dữ liệu). Trả null nếu không hợp lệ.
function vnToISO(s){
  var m=String(s||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(!m) return null;
  return m[3]+'-'+pad2(m[2])+'-'+pad2(m[1]);
}
// dd/MM/yyyy -> Date (cho so sánh/lọc thời gian ở báo cáo)
function chuyenNgay(s){
  var m=String(s||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(!m) return null;
  var d=new Date(parseInt(m[3],10), parseInt(m[2],10)-1, parseInt(m[1],10));
  return isNaN(d.getTime())?null:d;
}
function thangKey(dstr){
  var m=String(dstr||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? (m[3]+'-'+pad2(m[2])) : '';
}
// Loại hồ sơ (QT/TH/SH)
function loaiHoSo(r){
  var lt=String(r.loaitab||'').trim().toUpperCase();
  if(lt==='TH'||lt==='SH'||lt==='QT') return lt;
  var v=String(r.loaihinh||'').trim().toLowerCase();
  if(v==='trước hoàn') return 'TH';
  if(v==='sau hoàn')   return 'SH';
  return 'QT';
}
// Người có tên trong đoàn?
function isInDoan(rec, hoten){
  if(!hoten) return false;
  var t=String(hoten).trim().toLowerCase();
  return ['truongdoan','phodoan','tv1','tv2','tv3','tv4'].some(function(f){
    return String(rec[f]||'').trim().toLowerCase()===t;
  });
}
// Lọc tên NNT từ cột "Nơi nhận" (bỏ cơ quan nhà nước) — port từ locTenNNT_
function lamSachTen(s){
  return String(s||'')
    .replace(/\((?:[^()]*(?:THUẾ|CỤC|PHÒNG|HCM)[^()]*)\)/gi,'')
    .replace(/\s{2,}/g,' ').trim();
}
function locTenNNT(s){
  s=String(s||'').trim(); if(!s) return '';
  var phan=s.split(/\s*;\s*/).map(function(x){return x.trim();}).filter(Boolean);
  var boQua=/^(Phòng|Sở|Cục|Chi cục|Đội|Văn phòng|Ban|Ủy ban|UBND|Báo|Trung tâm|Kho bạc)\b/i;
  var conLai=phan.filter(function(p){return !boQua.test(p);});
  var dn=/(CÔNG TY|CTY|DOANH NGHIỆP|CHI NHÁNH|HỢP TÁC XÃ|HTX|TỔNG CÔNG TY|NGÂN HÀNG|HỘ KINH DOANH|VĂN PHÒNG ĐẠI DIỆN)/i;
  for(var i=0;i<conLai.length;i++){ if(dn.test(conLai[i])) return lamSachTen(conLai[i]); }
  if(conLai.length) return lamSachTen(conLai[conLai.length-1]);
  return '';
}
// Phân loại văn bản -> cặp ô đích — port từ phanLoaiVanBan_
function phanLoaiVanBan(soPH, loaiVB, trich){
  var s=(soPH||'').toUpperCase(), l=(loaiVB||'').toUpperCase(), t=(trich||'').toUpperCase();
  var lt=l+' '+t;
  if(/QUYẾT ĐỊNH KIỂM TRA|QUYET DINH KIEM TRA/.test(l)) return {so:'soqdkt', ngay:'ngayqdkt'};
  if(/KẾT LUẬN|KET LUAN|ADKPHQ|QĐXL|QDXL|\bTHH\b/.test(lt)) return {so:'soklkt', ngay:'ngayklkt'};
  if(/TẠM HOÃN|TAM HOAN/.test(lt)) return {so:'sotamhoan', ngay:'ngaytamhoan'};
  if(/TẠM DỪNG|TAM DUNG/.test(lt)) return {so:'sotamdung', ngay:'ngaytamdung'};
  if(/GIA HẠN|GIA HAN/.test(lt))   return {so:'sogiahan', ngay:'ngaygiahan'};
  var m=s.match(/\/\s*([A-ZĐ]+)\s*-/); var ky=m?m[1]:'';
  if(/QĐ|QD/.test(ky)) return {so:'soqdkt', ngay:'ngayqdkt'};
  if(/KL/.test(ky))    return {so:'soklkt', ngay:'ngayklkt'};
  return {so:'soqdkt', ngay:'ngayqdkt'};
}
// Tách nội dung dán VPĐT -> các trường — port từ parsePastedVPDT
function parsePastedVPDT_local(pasteText){
  var text=String(pasteText||'');
  var result={mst:'',tencty:'',soqdkt:'',ngayqdkt:'',soklkt:'',ngayklkt:'',raw:text};
  var mstM=text.match(/(^|[^\d])(\d{10}(?:-\d{3})?)(?!\d)/);
  if(mstM) result.mst=mstM[2];
  var nntM=text.match(/((?:CÔNG TY|CTY|DOANH NGHIỆP TƯ NHÂN|DOANH NGHIỆP|CHI NHÁNH|HỢP TÁC XÃ|HTX|HỘ KINH DOANH|TỔNG CÔNG TY)\b[\s\S]*?)(?=\s*(?:Chờ phát hành|Hoàn thành|Đã phát hành|Đang xử lý)|\t|\n|$)/i);
  if(nntM){
    var name=nntM[1].trim().replace(/\s*\b\d{10}(?:-\d{3})?\b\s*/g,' ').replace(/\s+/g,' ').trim();
    result.tencty=name;
  }
  var docRe=/(\d{2,6})\s*\/\s*([A-ZĐ\.\-]+)\s*-\s*([A-ZĐ]+)/gi, docs=[], m;
  while((m=docRe.exec(text))!==null){
    docs.push({so:m[1], full:(m[1]+'/'+m[2]+'-'+m[3]).replace(/\s+/g,''), kyhieu:m[2].toUpperCase()});
  }
  var dateRe=/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, dates=[];
  while((m=dateRe.exec(text))!==null){ dates.push(pad2(m[1])+'/'+pad2(m[2])+'/'+m[3]); }
  docs.forEach(function(doc){
    var ky=doc.kyhieu;
    if(/QĐ|QD/.test(ky) && !result.soqdkt) result.soqdkt=doc.full;
    else if(/(KL|TB|ADKPHQ|QĐXL|THH|QDXL)/.test(ky) && !result.soklkt) result.soklkt=doc.full;
  });
  if(!result.soqdkt && docs[0]) result.soqdkt=docs[0].full;
  if(!result.soklkt && docs[1] && docs[1].full!==result.soqdkt) result.soklkt=docs[1].full;
  if(dates[0]) result.ngayqdkt=dates[0];
  if(dates[1]) result.ngayklkt=dates[1];
  result.docsFound=docs.length; result.datesFound=dates.length;
  return result;
}
// Tách 1 dòng dán -> [ID, Số PH, Ngày, Loại VB, Trích yếu, MST, Tên NNT] — port extractRow_
function extractRow_local(line, cells){
  var idM=line.match(/\b(\d{6})\b/);
  var docM=line.match(/(\d{2,6}\/[A-ZĐ\.\-]+-[A-ZĐ]+)/i);
  var dateM=line.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  var mstM=line.match(/\b(\d{10}(?:-\d{3})?)\b/);
  var nntM=line.match(/((?:CÔNG TY|CTY|DOANH NGHIỆP|CHI NHÁNH|HỢP TÁC XÃ|HTX|HỘ KINH DOANH|TỔNG CÔNG TY)\b[\s\S]*?)(?=\s*(?:Chờ phát hành|Hoàn thành|Đã phát hành|Đang xử lý)|\t|$)/i);
  if(!idM && !docM) return null;
  var loai='';
  if(cells && cells.length>=4){
    for(var i=0;i<cells.length;i++){
      if(/\d+\/[A-ZĐ]/i.test(cells[i]) || /\d{1,2}\/\d{1,2}\/\d{4}/.test(cells[i])) continue;
      if(/Quyết định|Thông báo|Kết luận|Biên bản|^TB\b|ADKPHQ/i.test(cells[i])){ loai=cells[i]; break; }
    }
  }
  var tencty=nntM ? nntM[1].replace(/\s*\b\d{10}(?:-\d{3})?\b\s*/g,' ').replace(/\s+/g,' ').trim() : '';
  return [ idM?idM[1]:'', docM?docM[1]:'', dateM?dateM[1]:'', loai, '', mstM?mstM[1]:'', tencty ];
}

/* ====================== C. CHUYỂN ĐỔI DB <-> BẢN GHI ====================== */
function toInt(v){
  var s=String(v==null?'':v).replace(/[^\d-]/g,'');
  if(s==='' || s==='-') return null;
  var n=parseInt(s,10); return isNaN(n)?null:n;
}
// Dòng DB -> bản ghi cho giao diện (giống dữ liệu getRecords cũ)
function dbToRec(row){
  var rec={};
  COLUMNS.forEach(function(c){
    if(c.group==='_') return;
    var v=row[c.key];
    if(DATE_COLS.indexOf(c.key)>=0)       rec[c.key]=normDateVN(v);
    else if(MONEY_COLS.indexOf(c.key)>=0) rec[c.key]=(v==null?'':Number(v));
    else if(c.key==='songayquahan')       rec[c.key]=(v==null?'':Number(v));
    else                                  rec[c.key]=(v==null?'':String(v));
  });
  rec._row=row.id;
  return rec;
}
// Bản ghi từ form -> dòng DB (chỉ các cột thật, bỏ cột tự tính)
function recToDb(rec){
  var db={};
  COLUMNS.forEach(function(c){
    if(c.group==='_' || AUTO_COLS.indexOf(c.key)>=0) return;
    if(!(c.key in rec)) return;
    var v=rec[c.key];
    if(DATE_COLS.indexOf(c.key)>=0)       db[c.key]=vnToISO(v);
    else if(MONEY_COLS.indexOf(c.key)>=0) db[c.key]=toInt(v);
    else { var s=String(v==null?'':v).trim(); db[c.key]=(s===''?null:s); }
  });
  return db;
}
function viError(e){
  var msg=(e && (e.message||e.error_description||e.details||e.hint)) || String(e);
  if(e && (e.code==='42501' || /row-level security|violates row-level/i.test(msg)))
    return new Error('Bạn không có quyền thực hiện thao tác này (email chưa được cấp quyền, hoặc hồ sơ không thuộc đoàn của bạn).');
  return new Error(msg);
}

/* ====================== D. LỚP SERVER (thay các hàm backend cũ) ====================== */
var SERVER = {
  async getConfig(){
    var email=(USER.email||'').toLowerCase();
    var q=await SB.from('can_bo').select('stt,hoten,email,vaitro').order('stt');
    if(q.error) throw viError(q.error);
    var rows=q.data||[];
    CANBO=rows.map(function(r){return String(r.hoten||'').trim();}).filter(Boolean);
    var me=rows.filter(function(r){return String(r.email||'').toLowerCase().trim()===email;})[0];
    USER = me ? {email:email, hoten:String(me.hoten||'').trim(), vaitro:String(me.vaitro||'congchuc').toLowerCase().trim()}
              : {email:email, hoten:'', vaitro:'guest'};
    COLUMNS_PUB = COLUMNS.filter(function(c){return c.group!=='_';}).map(function(c){
      var o={key:c.key,label:c.label,type:c.type,group:c.group};
      if(c.tabs) o.tabs=c.tabs.slice();
      if(c.options) o.options=c.options.slice();
      if(c.fillSo) o.fillSo=c.fillSo;
      if(c.fillNgay) o.fillNgay=c.fillNgay;
      return o;
    });
    return {user:USER, columns:COLUMNS_PUB, canbo:CANBO, vpdtBase:VPDT_URL_BASE};
  },

  async getRecords(filterDoan){
    var q=SB.from('ho_so').select('*').order('id');
    if(filterDoan) q=q.eq('truongdoan', filterDoan);
    var {data,error}=await q;
    if(error) throw viError(error);
    return {user:USER, rows:(data||[]).map(dbToRec), columns:COLUMNS_PUB};
  },

  async saveRecord(record, rowIndex){
    if(USER.vaitro==='guest') throw new Error('Email của bạn chưa được cấp quyền. Liên hệ admin.');
    var db=recToDb(record);
    if(rowIndex){
      var up=await SB.from('ho_so').update(db).eq('id', rowIndex).select('id');
      if(up.error) throw viError(up.error);
      if(!up.data || !up.data.length)
        throw new Error('Không lưu được. Có thể hồ sơ đã ở trạng thái HOÀN THÀNH (chỉ admin sửa được) hoặc không thuộc quyền của bạn.');
      return {ok:true, msg:'Đã cập nhật hồ sơ.', row:rowIndex};
    } else {
      var ins=await SB.from('ho_so').insert(db).select('id');
      if(ins.error) throw viError(ins.error);
      return {ok:true, msg:'Đã thêm hồ sơ mới.', row:ins.data[0].id};
    }
  },

  async findByMST(mst){
    mst=String(mst||'').trim();
    if(!mst) return {ok:false, msg:'Chưa nhập MST.'};
    var {data,error}=await SB.from('ho_so').select('*').eq('mst', mst).order('id');
    if(error) throw viError(error);
    var rows=(data||[]).map(dbToRec).filter(function(rec){
      return (USER.vaitro==='admin'||USER.vaitro==='lanhdao') || isInDoan(rec, USER.hoten);
    });
    return {ok:true, rows:rows, count:rows.length,
      msg: rows.length? ('Tìm thấy '+rows.length+' hồ sơ với MST '+mst) : ('Không tìm thấy hồ sơ nào với MST '+mst)};
  },

  async lookupVPDTById(idvb){
    idvb=String(idvb||'').trim();
    if(!idvb) return {found:false, msg:'Chưa nhập ID.'};
    var {data,error}=await SB.from('vpdt').select('*').eq('id_vanban', idvb).limit(1);
    if(error) throw viError(error);
    if(!data || !data.length) return {found:false, msg:'Không tìm thấy ID '+idvb+' trong dữ liệu đã import.'};
    var r=data[0];
    var target=phanLoaiVanBan(r.so_phathanh, r.loai_vb, r.trich_yeu);
    return {found:true, mst:String(r.mst||''), tencty:locTenNNT(r.ten_nnt),
      loaiVB:String(r.loai_vb||''), soPhatHanh:String(r.so_phathanh||''),
      ngayPhatHanh:normDateVN(r.ngay_phathanh), targetSo:target.so, targetNgay:target.ngay};
  },

  async lookupAllIds(idMap){
    var idCols=COLUMNS.filter(function(c){return c.type==='idlookup';});
    var ids=[];
    idCols.forEach(function(c){ var v=String((idMap&&idMap[c.key])||'').trim(); if(v) ids.push(v); });
    var cnt=await SB.from('vpdt').select('id_vanban',{count:'exact',head:true});
    if(cnt.error) throw viError(cnt.error);
    if(!cnt.count) return {ok:false, msg:'Kho VPĐT chưa có dữ liệu. Hãy cập nhật dữ liệu trước.'};
    var index={};
    if(ids.length){
      var {data,error}=await SB.from('vpdt').select('*').in('id_vanban', ids);
      if(error) throw viError(error);
      (data||[]).forEach(function(r){
        index[String(r.id_vanban).trim()]={so:String(r.so_phathanh||'').trim(),
          ngay:normDateVN(r.ngay_phathanh), mst:String(r.mst||'').trim(), tencty:locTenNNT(r.ten_nnt)};
      });
    }
    var fills={}, notFound=[], mst='', tencty='', foundCount=0;
    idCols.forEach(function(c){
      var idVal=String((idMap&&idMap[c.key])||'').trim();
      if(!idVal) return;
      var hit=index[idVal];
      if(hit){
        fills[c.fillSo]=hit.so; fills[c.fillNgay]=hit.ngay;
        if(!mst && hit.mst) mst=hit.mst;
        if(!tencty && hit.tencty) tencty=hit.tencty;
        foundCount++;
      } else { notFound.push({label:c.label, id:idVal}); }
    });
    return {ok:true, fills:fills, mst:mst, tencty:tencty, notFound:notFound, foundCount:foundCount};
  },
  lookupNhieuID(idMap){ return SERVER.lookupAllIds(idMap); },

  parsePastedVPDT(text){ return Promise.resolve(parsePastedVPDT_local(text)); },

  async traTenNNT(mst){
    mst=String(mst||'').trim();
    if(!mst) return {ok:false, msg:''};
    var {data,error}=await SB.from('ds_nnt').select('*').eq('mst', mst).limit(1);
    if(error) throw viError(error);
    if(data && data.length) return {ok:true, mst:mst, ten:String(data[0].ten_nnt||'').trim()};
    return {ok:false, msg:'Không tìm thấy MST '+mst+' trong danh sách.'};
  },

  async capNhatDsNNT(pasteText){
    if(USER.vaitro==='guest') throw new Error('Email của bạn chưa được cấp quyền.');
    var lines=String(pasteText||'').split(/\r?\n/).filter(function(l){return l.trim();});
    if(!lines.length) return {ok:false, msg:'Bạn chưa dán dữ liệu.'};
    var map={};
    lines.forEach(function(line){
      if(/mã\s*số\s*thuế/i.test(line) && !/\d{5,}/.test(line)) return;
      var c=line.split(/\t/); if(c.length<2) c=line.split(/\s{2,}/);
      var mst='', ten='';
      for(var i=0;i<c.length;i++){
        var x=String(c[i]).trim();
        if(!mst && /^\d{10}(-\d{3})?$/.test(x)) mst=x;
        else if(mst && !ten && x && !/^\d+$/.test(x)){ ten=x; break; }
      }
      if(mst) map[mst]=ten;
    });
    var msts=Object.keys(map);
    if(!msts.length) return {ok:false, msg:'Không nhận ra MST nào.'};
    var ex=await SB.from('ds_nnt').select('mst').in('mst', msts);
    if(ex.error) throw viError(ex.error);
    var daCo={}; (ex.data||[]).forEach(function(r){daCo[r.mst]=1;});
    var them=0, sua=0, rows=msts.map(function(m){ if(daCo[m])sua++;else them++; return {mst:m, ten_nnt:map[m]}; });
    var up=await SB.from('ds_nnt').upsert(rows, {onConflict:'mst'});
    if(up.error) throw viError(up.error);
    return {ok:true, them:them, sua:sua, tong:msts.length,
      msg:'Đã cập nhật danh sách NNT: thêm '+them+', sửa '+sua+'. Tổng '+msts.length+' MST vừa xử lý.'};
  },

  async capNhatDuLieuVPDT(pasteText, preStructured){
    if(USER.vaitro==='guest') throw new Error('Email của bạn chưa được cấp quyền.');
    var lines=String(pasteText||'').split(/\r?\n/).filter(function(l){return l.trim();});
    if(!lines.length) return {ok:false, msg:'Bạn chưa dán dữ liệu.'};
    var parsed=[];
    lines.forEach(function(line){
      if(preStructured){
        var c=line.split(/\t/);
        var id=String(c[0]||'').trim().replace(/\.0+$/,'');
        if(!id || !/\d/.test(id)) return;
        parsed.push([id, String(c[1]||'').trim(), normDateVN(c[2]), String(c[3]||'').trim(),
                     String(c[4]||'').trim(), String(c[5]||'').trim(), locTenNNT(c[6])]);
        return;
      }
      if(/ID\s*văn\s*bản|Số\s*phát\s*hành/i.test(line) && !/\d{5,}/.test(line)) return;
      var cells=line.split(/\t/).map(function(x){return x.trim();});
      if(cells.length<3) cells=line.split(/\s{2,}/).map(function(x){return x.trim();});
      var rec=extractRow_local(line, cells);
      if(rec) parsed.push(rec);
    });
    if(!parsed.length) return {ok:false, msg:'Không nhận ra dòng dữ liệu nào. Kiểm tra lại nội dung dán.'};
    var byId={};
    parsed.forEach(function(r){ if(r[0]) byId[String(r[0]).trim()]=r; });
    var ids=Object.keys(byId);
    var ex=await SB.from('vpdt').select('id_vanban').in('id_vanban', ids);
    if(ex.error) throw viError(ex.error);
    var daCo={}; (ex.data||[]).forEach(function(r){daCo[r.id_vanban]=1;});
    var them=0, sua=0, rows=ids.map(function(id){
      if(daCo[id])sua++;else them++;
      var r=byId[id];
      return {id_vanban:id, so_phathanh:r[1]||null, ngay_phathanh:vnToISO(r[2]),
        loai_vb:r[3]||null, trich_yeu:r[4]||null, mst:r[5]||null, ten_nnt:r[6]||null, updated_at:new Date().toISOString()};
    });
    var up=await SB.from('vpdt').upsert(rows, {onConflict:'id_vanban'});
    if(up.error) throw viError(up.error);
    return {ok:true, them:them, sua:sua, tong:ids.length,
      msg:'Đã cập nhật: thêm '+them+', sửa '+sua+'. Vừa xử lý '+ids.length+' hồ sơ VPĐT.'};
  },

  async capNhatDuLieuConThieu(){
    if(USER.vaitro==='guest') throw new Error('Email của bạn chưa được cấp quyền.');
    var {data,error}=await SB.rpc('dien_bu_du_lieu_con_thieu');
    if(error) throw viError(error);
    return data;
  },

  // Báo cáo tổng hợp — port từ getReportSummary (lọc & cộng ngay tại giao diện)
  async getReportSummary(loc){
    loc=loc||{};
    var soDong=Number(loc.soDong)||100;
    var trang=Math.max(1, Number(loc.trang)||1);
    var res=await SERVER.getRecords(null);
    var rows=res.rows;
    function num(x){return Number(String(x==null?'':x).replace(/[.,\s]/g,''))||0;}

    if(loc.mocNgay){
      var tu=chuyenNgay(loc.tuNgay), den=chuyenNgay(loc.denNgay);
      if(tu||den){
        rows=rows.filter(function(r){
          var d=chuyenNgay(r[loc.mocNgay]); if(!d) return false;
          if(tu && d<tu) return false; if(den && d>den) return false; return true;
        });
      }
    }
    if(loc.loai) rows=rows.filter(function(r){return loaiHoSo(r)===loc.loai;});
    if(loc.doan) rows=rows.filter(function(r){return String(r.truongdoan||'').trim()===loc.doan;});

    var byDoan={}, byLoaiHinh={}, byThang={}, byLoaiKH={};
    var tong={soHoSo:0,tongThuPhat:0,giamLo:0,daNop:0,giamKhauTru:0,khongHoan:0,soQuaHan:0};
    rows.forEach(function(r){
      var thuphat=num(r.tongcong);
      var d=String(r.truongdoan||'(chưa gán)').trim();
      if(!byDoan[d]) byDoan[d]={truongdoan:d,soHoSo:0,tongThuPhat:0,giamKhauTru:0,giamLo:0,khongHoan:0,daNop:0,soQuaHan:0};
      byDoan[d].soHoSo++; byDoan[d].tongThuPhat+=thuphat;
      byDoan[d].giamKhauTru+=num(r.giamkhautru); byDoan[d].giamLo+=num(r.giamlo);
      byDoan[d].khongHoan+=num(r.thue_khonghoan); byDoan[d].daNop+=num(r.danop);
      if(Number(r.songayquahan)>0) byDoan[d].soQuaHan++;
      var lh=String(r.loaihinh||'(chưa phân loại)').trim();
      if(!byLoaiHinh[lh]) byLoaiHinh[lh]={ten:lh,soHoSo:0,tongThuPhat:0};
      byLoaiHinh[lh].soHoSo++; byLoaiHinh[lh].tongThuPhat+=thuphat;
      var mth=thangKey(r.ngayqdkt);
      if(mth){ if(!byThang[mth]) byThang[mth]={thang:mth,soHoSo:0,tongThuPhat:0}; byThang[mth].soHoSo++; byThang[mth].tongThuPhat+=thuphat; }
      var lkh=String(r.loaikh||'(chưa phân loại)').trim();
      byLoaiKH[lkh]=(byLoaiKH[lkh]||0)+1;
      tong.soHoSo++; tong.tongThuPhat+=thuphat; tong.giamLo+=num(r.giamlo); tong.daNop+=num(r.danop);
      tong.giamKhauTru+=num(r.giamkhautru); tong.khongHoan+=num(r.thue_khonghoan);
      if(Number(r.songayquahan)>0) tong.soQuaHan++;
    });
    var arrDoan=Object.keys(byDoan).map(function(k){return byDoan[k];}).sort(function(a,b){return b.tongThuPhat-a.tongThuPhat;});
    var arrLH=Object.keys(byLoaiHinh).map(function(k){return byLoaiHinh[k];}).sort(function(a,b){return b.soHoSo-a.soHoSo;});
    var arrThang=Object.keys(byThang).map(function(k){return byThang[k];}).sort(function(a,b){return a.thang<b.thang?-1:1;});
    var arrLKH=Object.keys(byLoaiKH).map(function(k){return {ten:k,soHoSo:byLoaiKH[k]};}).sort(function(a,b){return b.soHoSo-a.soHoSo;});

    var dsDoan;
    if(loc.doan){ var mm={}; res.rows.forEach(function(r){var dd=String(r.truongdoan||'').trim(); if(dd)mm[dd]=1;}); dsDoan=Object.keys(mm).sort(); }
    else dsDoan=arrDoan.map(function(x){return x.truongdoan;}).sort();

    var tongSo=rows.length;
    var soTrang=Math.max(1, Math.ceil(tongSo/soDong));
    if(trang>soTrang) trang=soTrang;
    var batDau=(trang-1)*soDong;
    var trangChiTiet=rows.slice(batDau, batDau+soDong);
    var cols=COLUMNS_PUB.slice();
    if(loc.loai) cols=cols.filter(function(c){return !c.tabs || c.tabs.indexOf(loc.loai)>=0;});
    var keyCanGui={}; cols.forEach(function(c){keyCanGui[c.key]=1;}); keyCanGui['_row']=1;
    var chiTietGon=trangChiTiet.map(function(r){var o={}; Object.keys(keyCanGui).forEach(function(k){if(r[k]!==undefined)o[k]=r[k];}); return o;});

    return {user:res.user, summary:arrDoan, byLoaiHinh:arrLH, byThang:arrThang, byLoaiKH:arrLKH,
      tong:tong, detail:chiTietGon, columns:cols, dsDoan:dsDoan,
      tongSo:tongSo, trang:trang, soTrang:soTrang, soDong:soDong};
  }
};

/* ====================== E. LỚP TƯƠNG THÍCH google.script.run ====================== */
/* Cho phép phần giao diện gọi y hệt như trên Apps Script cũ:
   google.script.run.withSuccessHandler(f).withFailureHandler(g).tenHam(args)  */
var SERVER_METHODS = ['getConfig','getRecords','saveRecord','findByMST','lookupVPDTById',
  'lookupAllIds','lookupNhieuID','parsePastedVPDT','traTenNNT','capNhatDsNNT',
  'capNhatDuLieuVPDT','capNhatDuLieuConThieu','getReportSummary'];
function makeRunner(){
  var onOK=null, onErr=null;
  var api={ withSuccessHandler:function(f){onOK=f;return api;}, withFailureHandler:function(f){onErr=f;return api;} };
  SERVER_METHODS.forEach(function(name){
    api[name]=function(){
      var args=arguments;
      Promise.resolve().then(function(){ return SERVER[name].apply(SERVER, args); })
        .then(function(r){ if(onOK) onOK(r); })
        .catch(function(e){ if(onErr) onErr(e instanceof Error?e:new Error(String(e))); else console.error(e); });
      return api;
    };
  });
  return api;
}
window.google = window.google || {};
window.google.script = window.google.script || {};
Object.defineProperty(window.google.script, 'run', { get: makeRunner });
