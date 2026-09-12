/* =====================================================================
 *  KT4 · Giao diện (chuyển gần như nguyên văn từ NhapLieu_5.html)
 *  Chỉ khác 3 điểm so với bản Apps Script:
 *   - Có màn hình đăng nhập (Supabase Auth) ở đầu
 *   - Khởi động app được bọc trong khoiDongApp() (gọi sau khi đăng nhập)
 *   - Xuất Excel tải thẳng về máy (không cần tạo file trên Drive)
 * ===================================================================== */
var CFG=null, EDIT_ROW=null;
var BC=null;
var TRANG_HIEN_TAI=1;

function moBaoCao(ev){
  if(ev) ev.preventDefault();
  document.getElementById('khuNhapLieu').style.display='none';
  document.getElementById('khuBaoCao').style.display='block';
  document.getElementById('lnkBaoCao').textContent='✏️ Về nhập liệu';
  document.getElementById('lnkBaoCao').setAttribute('onclick','veNhapLieu(event)');
  taiBaoCao();
  window.scrollTo({top:0,behavior:'smooth'});
}
function veNhapLieu(ev){
  if(ev) ev.preventDefault();
  document.getElementById('khuBaoCao').style.display='none';
  document.getElementById('khuNhapLieu').style.display='block';
  document.getElementById('lnkBaoCao').textContent='📊 Xem báo cáo';
  document.getElementById('lnkBaoCao').setAttribute('onclick','moBaoCao(event)');
  window.scrollTo({top:0,behavior:'smooth'});
}

// ===== BÁO CÁO =====
function locLai(){ TRANG_HIEN_TAI=1; taiBaoCao(); }
function xoaLocThoiGian(){
  document.getElementById('bcMocNgay').value='';
  document.getElementById('bcTuNgay').value='';
  document.getElementById('bcDenNgay').value='';
  TRANG_HIEN_TAI=1; taiBaoCao();
}
function taiBaoCao(){
  document.getElementById('bcStatus').textContent='Đang tải dữ liệu…';
  batDangTai('Đang tải báo cáo');
  var loc={
    mocNgay: document.getElementById('bcMocNgay').value,
    tuNgay:  document.getElementById('bcTuNgay').value.trim(),
    denNgay: document.getElementById('bcDenNgay').value.trim(),
    doan:    (document.getElementById('bcDoan')||{}).value || '',
    loai:    (document.getElementById('bcLoai')||{}).value || '',
    trang:   TRANG_HIEN_TAI, soDong: 100
  };
  google.script.run.withSuccessHandler(function(res){
    tatDangTai(); BC=res;
    var vt=String(res.user.vaitro||'').toLowerCase();
    var tatCa=(vt==='admin'||vt==='lanhdao');
    document.getElementById('bcPhamVi').innerHTML = tatCa
      ? '<b style="color:#188038">Phạm vi: toàn phòng</b> — bạn xem được hồ sơ của tất cả các đoàn.'
      : '<b style="color:#b06000">Phạm vi: giới hạn</b> — chỉ hồ sơ mà bạn là trưởng đoàn, phó đoàn hoặc thành viên.';
    if(!res.detail || !res.detail.length){
      document.getElementById('bcStatus').textContent='';
      document.getElementById('bcKpis').innerHTML='<div class="hint" style="grid-column:1/-1;background:#fff8e1;border:1px solid #f0d78a;padding:10px;border-radius:6px">Chưa có hồ sơ nào. Hãy nhập hồ sơ ở khu nhập liệu rồi quay lại đây.</div>';
      document.getElementById('bcDoanBody').innerHTML='';
      document.getElementById('bcThead').innerHTML='';
      document.getElementById('bcTbody').innerHTML='';
      return;
    }
    document.getElementById('bcStatus').textContent='Đã tải '+res.detail.length+' hồ sơ.';
    var sel=document.getElementById('bcDoan');
    var dangChon=sel.value;
    var ds=res.dsDoan||[];
    sel.innerHTML='<option value="">— Tất cả đoàn —</option>';
    ds.forEach(function(d){ var o=document.createElement('option'); o.value=d; o.textContent=d; sel.appendChild(o); });
    sel.value=dangChon;
    veBaoCao();
  }).withFailureHandler(function(e){
    tatDangTai();
    document.getElementById('bcStatus').textContent='';
    document.getElementById('bcKpis').innerHTML='<div class="hint" style="grid-column:1/-1;background:#fce8e6;border:1px solid #f5b5b0;color:#c5221f;padding:10px;border-radius:6px">Lỗi tải báo cáo: '+(e&&e.message?e.message:e)+'</div>';
  }).getReportSummary(loc);
}

var COT_CHINH=['mst','tencty','truongdoan','loaihinh','loaikh','kykt','soqdkt','ngayqdkt','soklkt','ngayklkt','tongcong','danop','songayquahan'];
function loaiCuaHoSo(r){
  var v=String(r.loaihinh||'').trim().toLowerCase();
  if(v==='trước hoàn') return 'TH';
  if(v==='sau hoàn')   return 'SH';
  return 'QT';
}
function veBaoCao(){
  if(!BC) return;
  var sums=BC.summary||[];
  var t={ hs:(BC.tong&&BC.tong.soHoSo)||0, tp:(BC.tong&&BC.tong.tongThuPhat)||0,
    gkt:(BC.tong&&BC.tong.giamKhauTru)||0, gl:(BC.tong&&BC.tong.giamLo)||0,
    kh:(BC.tong&&BC.tong.khongHoan)||0, dn:(BC.tong&&BC.tong.daNop)||0, qh:(BC.tong&&BC.tong.soQuaHan)||0 };
  document.getElementById('bcKpis').innerHTML=
    bcKpi('#1a73e8','Tổng số hồ sơ',t.hs.toLocaleString('vi-VN'))+
    bcKpiTien('#188038','Tổng truy thu, phạt',t.tp)+
    bcKpiTien('#00897b','Giảm khấu trừ',t.gkt)+
    bcKpiTien('#8430ce','Giảm lỗ',t.gl)+
    bcKpiTien('#b06000','Không hoàn',t.kh)+
    bcKpiTien('#0b8043','Đã nộp NSNN',t.dn)+
    bcKpi('#455a64','Số đoàn',sums.length)+
    (t.qh? bcKpi('#c5221f','⚠ Hồ sơ quá hạn',t.qh.toLocaleString('vi-VN')) : '');
  var tb=document.getElementById('bcDoanBody'); tb.innerHTML='';
  sums.forEach(function(s){
    var qh=s.soQuaHan||0;
    tb.innerHTML+='<tr><td>'+s.truongdoan+'</td><td style="text-align:center">'+s.soHoSo+
      '</td><td class="money">'+money(s.tongThuPhat)+'</td><td class="money">'+money(s.giamKhauTru||0)+
      '</td><td class="money">'+money(s.giamLo)+'</td><td class="money">'+money(s.khongHoan||0)+
      '</td><td class="money">'+money(s.daNop)+
      '</td><td style="text-align:center'+(qh?';color:#c5221f;font-weight:700':'')+'">'+(qh||'')+'</td></tr>';
  });
  if(sums.length){
    tb.innerHTML+='<tr style="background:#eef3fb;font-weight:700;border-top:2px solid #1a73e8">'+
      '<td>TỔNG CỘNG ('+sums.length+' đoàn)</td><td style="text-align:center">'+t.hs.toLocaleString('vi-VN')+'</td>'+
      '<td class="money">'+money(t.tp)+'</td><td class="money">'+money(t.gkt)+'</td>'+
      '<td class="money">'+money(t.gl)+'</td><td class="money">'+money(t.kh)+'</td>'+
      '<td class="money">'+money(t.dn)+'</td><td style="text-align:center;color:#c5221f">'+(t.qh||'')+'</td></tr>';
  }
  veChiTiet();
}
function veChiTiet(){
  if(!BC) return;
  var sel=document.getElementById('bcCheDoCot');
  var cheDo=sel?sel.value:'chinh';
  var cols=BC.columns.filter(function(c){
    if(cheDo==='tatca') return true;
    var laTien=(c.type==='money'||c.type==='autocalc');
    if(cheDo==='tien') return COT_CHINH.indexOf(c.key)>=0 || laTien;
    return COT_CHINH.indexOf(c.key)>=0;
  });
  var th='<tr>'+cols.map(function(c,i){ return '<th class="'+(i===0?'dinh1':'')+'">'+c.label+'</th>'; }).join('')+'</tr>';
  document.getElementById('bcThead').innerHTML=th;
  var rows=BC.detail||[];
  var tb2=document.getElementById('bcTbody');
  if(!rows.length){
    tb2.innerHTML='<tr><td colspan="'+cols.length+'" class="loading">Không có hồ sơ nào.</td></tr>';
  } else {
    var html='';
    rows.forEach(function(r){
      html+='<tr>'+cols.map(function(c,i){
        var v=r[c.key];
        var isM=(c.type==='money'||c.type==='autocalc');
        var cls=(i===0?'dinh1':'')+(isM?' money':'');
        if(c.key==='tencty') cls+=' rong';
        var show;
        if(c.key==='songayquahan'){
          var n=Number(v)||0;
          if(v===''||v==null){ show=''; }
          else if(n>0){ show='⚠ '+n+' ngày'; cls+=' quahan'; }
          else { show='✓ đúng hạn'; cls+=' dunghan'; }
        } else if(isM){
          var so=String(v==null?'':v).replace(/\D/g,'');
          show=so?so.replace(/\B(?=(\d{3})+(?!\d))/g,'.'):'';
        } else { show=(v===0||v)?v:''; }
        return '<td class="'+cls.trim()+'" title="'+String(show).replace(/"/g,'')+'">'+show+'</td>';
      }).join('')+'</tr>';
    });
    tb2.innerHTML=html;
  }
  var tongSo=BC.tongSo||0, trang=BC.trang||1, soTrang=BC.soTrang||1, soDong=BC.soDong||100;
  var tu=(trang-1)*soDong+1, den=Math.min(trang*soDong, tongSo);
  var info=document.getElementById('bcDemCot');
  if(info) info.innerHTML='Đang hiện '+cols.length+'/'+BC.columns.length+' cột · '+
    (tongSo? ('hồ sơ '+tu+'–'+den+' trong tổng '+tongSo.toLocaleString('vi-VN')) : '0 hồ sơ');
  veNutTrang(trang, soTrang);
}
function veNutTrang(trang, soTrang){
  var k=document.getElementById('bcPhanTrang'); if(!k) return;
  if(soTrang<=1){ k.innerHTML=''; return; }
  var h='';
  h+='<button class="btn small sec" '+(trang<=1?'disabled':'')+' onclick="doiTrang(1)">« Đầu</button> ';
  h+='<button class="btn small sec" '+(trang<=1?'disabled':'')+' onclick="doiTrang('+(trang-1)+')">‹ Trước</button> ';
  h+='<span style="margin:0 10px;font-size:14.5px">Trang <b>'+trang+'</b> / '+soTrang+'</span>';
  h+='<button class="btn small sec" '+(trang>=soTrang?'disabled':'')+' onclick="doiTrang('+(trang+1)+')">Sau ›</button> ';
  h+='<button class="btn small sec" '+(trang>=soTrang?'disabled':'')+' onclick="doiTrang('+soTrang+')">Cuối »</button>';
  k.innerHTML=h;
}
function doiTrang(t){ TRANG_HIEN_TAI=t; taiBaoCao(); }

function rutGonTien(n){
  n=Number(String(n==null?0:n).replace(/[.,\s]/g,''))||0;
  var day=n.toLocaleString('vi-VN')+' đ';
  if(n===0) return {chinh:'0', phu:''};
  var ty=1000000000, trieu=1000000;
  if(Math.abs(n)>=ty) return {chinh:(n/ty).toLocaleString('vi-VN',{maximumFractionDigits:1})+' tỷ', phu:day};
  if(Math.abs(n)>=trieu) return {chinh:(n/trieu).toLocaleString('vi-VN',{maximumFractionDigits:1})+' triệu', phu:day};
  return {chinh:n.toLocaleString('vi-VN'), phu:''};
}
function bcKpiTien(color,label,so){
  var r=rutGonTien(so);
  return '<div class="kpi-the" style="background:'+color+'"><div class="kpi-nhan">'+label+'</div>'+
    '<div class="kpi-so">'+r.chinh+'</div>'+
    (r.phu? '<div class="kpi-phu">'+r.phu+'</div>' : '<div class="kpi-phu">&nbsp;</div>')+'</div>';
}
function bcKpi(color,label,value){
  return '<div class="kpi-the" style="background:'+color+'"><div class="kpi-nhan">'+label+'</div>'+
    '<div class="kpi-so">'+value+'</div><div class="kpi-phu">&nbsp;</div></div>';
}

// Xuất Excel — tải THẲNG về máy (dùng thư viện SheetJS đã nhúng)
function tenNgayGio(){ var d=new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())+'_'+pad2(d.getHours())+pad2(d.getMinutes()); }
function xuatExcel(){
  if(!CFG){ showMsg('Chưa sẵn sàng để xuất.','err'); return; }
  if(typeof XLSX==='undefined'){ showMsg('Không tải được thư viện Excel (mạng có thể chặn). Thử lại sau.','err'); return; }
  var loc={ doan:document.getElementById('bcDoan').value,
    loai:(document.getElementById('bcLoai')||{}).value||'',
    mocNgay:document.getElementById('bcMocNgay').value,
    tuNgay:document.getElementById('bcTuNgay').value.trim(),
    denNgay:document.getElementById('bcDenNgay').value.trim() };
  batDangTai('Đang tạo file Excel');
  SERVER.getRecords(null).then(function(res){
    var rows=res.rows, cols=COLUMNS_PUB.slice();
    if(loc.mocNgay){
      var tu=chuyenNgay(loc.tuNgay), den=chuyenNgay(loc.denNgay);
      if(tu||den) rows=rows.filter(function(r){var d=chuyenNgay(r[loc.mocNgay]); if(!d)return false; if(tu&&d<tu)return false; if(den&&d>den)return false; return true;});
    }
    if(loc.loai){ rows=rows.filter(function(r){return loaiHoSo(r)===loc.loai;}); cols=cols.filter(function(c){return !c.tabs||c.tabs.indexOf(loc.loai)>=0;}); }
    if(loc.doan){ rows=rows.filter(function(r){return String(r.truongdoan||'').trim()===loc.doan;}); }
    tatDangTai();
    if(!rows.length){ showMsg('Không có hồ sơ nào để xuất.','err'); return; }
    var aoa=[cols.map(function(c){return c.label;})];
    rows.forEach(function(r){
      aoa.push(cols.map(function(c){
        var v=r[c.key];
        if(c.type==='money'||c.type==='autocalc'){ var n=Number(String(v==null?'':v).replace(/[.,\s]/g,'')); return isNaN(n)?'':n; }
        return (v===0||v)?String(v):'';   // giữ số 0 đầu của MST (dạng chữ)
      }));
    });
    var ws=XLSX.utils.aoa_to_sheet(aoa);
    var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Bao cao');
    var ten='BaoCao_KT4'+(loc.loai?'_'+loc.loai:'')+(loc.doan?'_'+loc.doan.replace(/\s+/g,'_'):'')+'_'+tenNgayGio()+'.xlsx';
    XLSX.writeFile(wb, ten);
    showMsg('Đã xuất file '+ten+' ('+rows.length+' hồ sơ). File đã tải về máy.','ok');
  }).catch(function(e){ tatDangTai(); showMsg('Không tạo được file: '+(e&&e.message?e.message:e),'err'); });
}

// ===== HIỆU ỨNG ĐANG XỬ LÝ =====
function batDangTai(chu){
  var o=document.getElementById('dangTai'); var c=document.getElementById('dangTaiChu');
  if(c) c.innerHTML=(chu||'Đang xử lý')+'<span class="cham"></span>';
  if(o) o.className='hien';
}
function tatDangTai(){ var o=document.getElementById('dangTai'); if(o) o.className=''; }
var money=function(n){ n=Number(n)||0; return n.toLocaleString('vi-VN'); };

window.onerror=function(msg,src,line){
  var tb=document.getElementById('listBody');
  if(tb) tb.innerHTML='<tr><td colspan="7" style="color:#c5221f;padding:12px">Lỗi giao diện: '+msg+' (dòng '+line+')</td></tr>';
  return false;
};

// ===== KHỞI ĐỘNG APP (gọi sau khi đăng nhập thành công) =====
function khoiDongApp(){
  google.script.run.withSuccessHandler(function(cfg){
    CFG=cfg;
    document.getElementById('who').textContent=
      (cfg.user.hoten||'(chưa gán tên)')+' · '+(cfg.user.email||'')+' · quyền: '+cfg.user.vaitro;
    toSangTab();
    try { buildForm(); } catch(e){ showMsg('Lỗi dựng form: '+e.message,'err'); }
    try { loadList(); } catch(e){
      var tb=document.getElementById('listBody');
      if(tb) tb.innerHTML='<tr><td colspan="7" style="color:#c5221f;padding:12px">Lỗi tải danh sách: '+e.message+'</td></tr>';
    }
    document.getElementById('btnSave').disabled=(cfg.user.vaitro==='guest');
    if(cfg.user.vaitro==='guest') showMsg('Email của bạn chưa được cấp quyền. Liên hệ admin để thêm email vào bảng cán bộ (can_bo).','err');
  }).withFailureHandler(function(e){ showMsg('Lỗi tải cấu hình: '+e.message,'err'); }).getConfig();
}

var TAB_HIEN_TAI='QT';
var LOAI_MAC_DINH={QT:'Quyết toán', TH:'Trước hoàn', SH:'Sau hoàn'};
function chonTab(tab){
  TAB_HIEN_TAI=tab; toSangTab(); buildForm();
  var o=document.getElementById('f_loaihinh');
  if(o){ var v=String(o.value||'').trim(); var thuoc=(tabTuLoaiHinh(v)===tab); if(!v||!thuoc) o.value=LOAI_MAC_DINH[tab]; }
  recalc(); updatePreview();
}
function toSangTab(){
  ['QT','TH','SH'].forEach(function(t){ var b=document.getElementById('tab_'+t); if(b) b.className='tabbtn'+(t===TAB_HIEN_TAI?' dang-chon':''); });
}
function tabCuaHoSo(rec){
  var lt=String((rec&&rec.loaitab)||'').trim().toUpperCase();
  if(lt==='TH'||lt==='SH'||lt==='QT') return lt;
  return tabTuLoaiHinh(rec&&rec.loaihinh);
}
function tabTuLoaiHinh(v){
  var s=String(v||'').trim().toLowerCase();
  if(s==='trước hoàn') return 'TH';
  if(s==='sau hoàn')   return 'SH';
  return 'QT';
}
function tabHienTai(){ return TAB_HIEN_TAI; }
function thuocTab(c, tab){ if(!c.tabs) return true; return c.tabs.indexOf(tab)>=0; }
function doiLoaiHinh(){
  var tabMoi=tabTuLoaiHinh(getV('loaihinh'));
  if(tabMoi!==TAB_HIEN_TAI){
    var giuLai={};
    CFG.columns.forEach(function(c){ var e=document.getElementById('f_'+c.key); if(e) giuLai[c.key]=e.value; });
    TAB_HIEN_TAI=tabMoi; toSangTab(); buildForm();
    Object.keys(giuLai).forEach(function(k){ var e=document.getElementById('f_'+k); if(e&&giuLai[k]) e.value=giuLai[k]; });
  }
  recalc(); updatePreview();
}
function buildForm(){
  var area=document.getElementById('formArea'); area.innerHTML='';
  var tab=tabHienTai(); var groups={};
  CFG.columns.forEach(function(c){ if(!thuocTab(c,tab)) return; if(!groups[c.group]) groups[c.group]=[]; groups[c.group].push(c); });
  function isInput(c){ return c.type!=='auto' && c.type!=='autocalc'; }
  Object.keys(groups).forEach(function(g){
    var cols=groups[g]; var visibleCols=cols.filter(isInput);
    if(!visibleCols.length){ cols.forEach(function(c){ addHiddenInput(area,c); }); return; }
    var mauNen='', mauChu='#333', mauVien='';
    if(g.indexOf('Thông tin chung')===0){ mauNen='#e3f2fd'; mauChu='#0d47a1'; mauVien='#90caf9'; }
    else if(g.indexOf('Phạt')===0){ mauNen='#fff8e1'; mauChu='#8a6d00'; mauVien='#f0c419'; }
    else if(g.indexOf('ID')===0){ mauNen='#fff3e0'; mauChu='#b06000'; mauVien='#ffcc80'; }
    else if(g.indexOf('Xử lý hồ sơ hoàn')===0){ mauNen='#f3e5f5'; mauChu='#6a1b9a'; mauVien='#ce93d8'; }
    var h=document.createElement('h3'); h.textContent=g;
    h.style.cssText='font-size:16px;font-weight:700;margin:20px 0 10px;padding:9px 13px;border-radius:8px;color:'+mauChu+';'+(mauNen?('background:'+mauNen+';border:1px solid '+mauVien+';'):'');
    area.appendChild(h);
    if(g.indexOf('ID')===0){
      var bar=document.createElement('div'); bar.style.cssText='margin:0 0 8px';
      bar.innerHTML='<button class="btn small" style="background:#b06000" onclick="traTatCaID()">🔎 Tra tất cả ID</button> <span id="idLookupInfo" class="hint"></span>';
      area.appendChild(bar);
    }
    var grid=document.createElement('div'); grid.className='grid';
    cols.forEach(function(c){
      if(!isInput(c)){ addHiddenInput(grid,c); return; }
      var box=document.createElement('div');
      if(c.key==='tencty') box.style.gridColumn='span 2';
      var batBuoc=laBatBuoc(c.key);
      var lbl='<label>'+c.label+(batBuoc?' <span class="batbuoc">*</span>':'')+'</label>';
      box.innerHTML=lbl+buildField(c);
      grid.appendChild(box);
    });
    area.appendChild(grid);
  });
  buildPreview();
}
function addHiddenInput(parent,c){ var el=document.createElement('input'); el.type='hidden'; el.id='f_'+c.key; parent.appendChild(el); }
function buildField(c){
  var xoaLoi='xoaLoiO(\''+c.key+'\')';
  if(c.key==='chuyende'){
    var op=(c.options||[]).map(function(o){return '<option>'+o+'</option>';}).join('');
    return '<select id="f_'+c.key+'" onchange="'+xoaLoi+';doiChuyenDe()"><option value="">— chọn —</option>'+op+'</select>'+
           '<input id="f_chuyende_khac" placeholder="Gõ tên chuyên đề" style="display:none;margin-top:6px" oninput="xoaLoiO(\'chuyende\')">';
  }
  if(c.key==='loaihinh'){
    var op1=(c.options||[]).map(function(o){return '<option>'+o+'</option>';}).join('');
    return '<select id="f_'+c.key+'" onchange="'+xoaLoi+';doiLoaiHinh()"><option value="">— chọn —</option>'+op1+'</select>';
  }
  if(c.type==='box'){
    var opts=c.options?c.options:CFG.canbo;
    return '<select id="f_'+c.key+'" onchange="'+xoaLoi+'"><option value="">— chọn —</option>'+
           opts.map(function(o){return '<option>'+o+'</option>';}).join('')+'</select>';
  } else if(c.type==='date'){
    return '<input type="date" id="f_'+c.key+'" onchange="'+xoaLoi+'" style="text-transform:none">';
  } else if(c.type==='money'){
    return '<input id="f_'+c.key+'" class="money" inputmode="numeric" oninput="'+xoaLoi+';dinhDangTien(this);recalc();updatePreview();">';
  } else if(c.type==='idlookup'){
    return '<input id="f_'+c.key+'" class="idlookup" inputmode="numeric" oninput="'+xoaLoi+'">';
  } else if(c.key==='kyhoan_sh'){
    return '<textarea id="f_'+c.key+'" rows="2" placeholder="VÍ DỤ: T01/2025; T02/2025; Q1/2026" oninput="'+xoaLoi+'" style="resize:vertical"></textarea>';
  } else if(c.key==='tencty'){
    return '<input id="f_'+c.key+'" style="text-transform:uppercase" oninput="'+xoaLoi+';vietHoa(this)">';
  } else if(c.key==='mst'){
    return '<input id="f_'+c.key+'" inputmode="numeric" maxlength="14" oninput="'+xoaLoi+'" onblur="traTenTheoMST()">';
  } else {
    return '<input id="f_'+c.key+'" oninput="'+xoaLoi+'">';
  }
}
function doiChuyenDe(){
  var sel=document.getElementById('f_chuyende'); var o=document.getElementById('f_chuyende_khac');
  if(!sel||!o) return;
  if(sel.value==='Khác'){ o.style.display='block'; o.focus(); } else { o.style.display='none'; o.value=''; }
}
function dinhDangTien(o){
  var so=String(o.value||'').replace(/\D/g,'');
  if(!so){ o.value=''; return; }
  o.value=so.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
}
function sangISO(s){ var m=String(s||'').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(!m) return ''; return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2); }
function sangVN(s){ var m=String(s||'').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!m) return String(s||'').trim(); return m[3]+'/'+m[2]+'/'+m[1]; }
function traTenTheoMST(){
  var mst=String(getV('mst')||'').trim(); if(!mst) return;
  var oTen=document.getElementById('f_tencty');
  google.script.run.withSuccessHandler(function(r){
    if(r && r.ok && r.ten){ if(oTen){ oTen.value=r.ten; xoaLoiO('tencty'); } showMsg('Đã tự điền tên NNT: '+r.ten,'ok'); }
    else { showMsg('MST '+mst+' chưa có trong danh sách NNT — bạn gõ tay tên đơn vị.','err'); }
  }).withFailureHandler(function(){}).traTenNNT(mst);
}
function vietHoa(o){ var vt=o.selectionStart; o.value=String(o.value||'').toUpperCase(); try{ o.setSelectionRange(vt,vt); }catch(e){} }
function xoaLoiO(key){ var e=document.getElementById('f_'+key); if(e) e.classList.remove('loi'); var h=document.getElementById('err_'+key); if(h) h.remove(); }
function buildPreview(){
  var h=document.createElement('div');
  h.style.cssText='margin-top:18px;border-top:2px dashed #cbd5e1;padding-top:12px';
  h.innerHTML='<h3 style="font-size:14.5px;color:#188038;margin:0 0 10px">👁️ Xem trước (tự điền khi tra ID & tự tính) — không cần nhập</h3>'+
    '<div id="previewGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:6px"></div>';
  document.getElementById('formArea').appendChild(h);
  updatePreview();
}
function updatePreview(){
  var wrap=document.getElementById('previewGrid'); if(!wrap) return;
  var autoCols=CFG.columns.filter(function(c){return c.type==='auto'||c.type==='autocalc';});
  wrap.innerHTML=autoCols.map(function(c){
    var v=getV(c.key);
    if(c.type==='autocalc'&&v) v=money(String(v).replace(/[.,\s]/g,''));
    var show=(v===0||v)?v:'—';
    var color=c.type==='autocalc'?'#188038':'#b06000';
    return '<div style="font-size:14.5px"><span style="color:#5f6b7a">'+c.label+':</span> <b style="color:'+color+'">'+show+'</b></div>';
  }).join('');
}
function recalc(){
  var num=function(id){ var v=document.getElementById('f_'+id); if(!v) return 0; var x=parseFloat(String(v.value).replace(/[.,\s]/g,'')); return isNaN(x)?0:x; };
  // Khớp đúng công thức lưu ở cơ sở dữ liệu (KHÔNG gồm Truy hoàn GTGT th_gtgt)
  var tong=['tt_gtgt','tt_tndn','tt_tncn','tt_nhathau','tt_khac','phat_thutuc','phat_khaisai','phat_tronthue','phat_khac','tienchamnop'].reduce(function(s,k){return s+num(k);},0);
  var el=document.getElementById('f_tongcong'); if(el) el.value=money(tong);
  var gl=document.getElementById('f_quydoigiamlo');
  if(gl) gl.value=money(num('giamkhautru')+Math.round(num('giamlo')*0.20));
}
function tachPaste(){
  var t=document.getElementById('pasteVPDT').value;
  if(!t.trim()){ showMsg('Bạn chưa dán nội dung.','err'); return; }
  google.script.run.withSuccessHandler(function(r){
    if(r.mst)setV('mst',r.mst); if(r.tencty)setV('tencty',r.tencty);
    if(r.soqdkt)setV('soqdkt',r.soqdkt); if(r.ngayqdkt)setV('ngayqdkt',r.ngayqdkt);
    if(r.soklkt)setV('soklkt',r.soklkt); if(r.ngayklkt)setV('ngayklkt',r.ngayklkt);
    recalc(); updatePreview();
    var found=[]; if(r.mst)found.push('MST'); if(r.tencty)found.push('tên NNT');
    found.push(r.docsFound+' số văn bản'); found.push(r.datesFound+' ngày');
    document.getElementById('pasteInfo').textContent='Đã tách: '+found.join(', ')+'. Kiểm tra & sửa lại nếu cần.';
  }).withFailureHandler(function(e){ showMsg(e.message,'err'); }).parsePastedVPDT(t);
}
function setV(id,val){ var e=document.getElementById('f_'+id); if(e) e.value=val; }
function getV(id){ var e=document.getElementById('f_'+id); return e?e.value:''; }
function openVPDT_(id){
  id=String(id||'').trim();
  if(!id){ showMsg('Bạn chưa nhập ID văn bản.','err'); return; }
  if(!CFG.vpdtBase){ showMsg('Chưa cấu hình link VPĐT (VPDT_URL_BASE trong config.js).','err'); return; }
  try{ if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(id); }catch(e){}
  window.open(CFG.vpdtBase,'_blank');
  document.getElementById('vpdtInfo').innerHTML='Đã mở trang tra cứu & copy ID <b>'+id+'</b>. Trên VPĐT: dán (Ctrl+V) vào ô "ID văn bản" → bấm Tìm kiếm.';
}
function capNhatNNT(){
  var t=document.getElementById('pasteNNT').value;
  if(!t.trim()){ showMsg('Bạn chưa dán dữ liệu.','err'); return; }
  var info=document.getElementById('nntInfo'); if(info) info.textContent='Đang cập nhật…';
  batDangTai('Đang cập nhật danh sách NNT');
  google.script.run.withSuccessHandler(function(r){
    tatDangTai();
    if(!r.ok){ if(info)info.textContent=''; showMsg(r.msg,'err'); return; }
    if(info) info.innerHTML='✓ '+r.msg;
    document.getElementById('pasteNNT').value=''; showMsg(r.msg,'ok');
  }).withFailureHandler(function(e){ tatDangTai(); if(info) info.textContent=''; showMsg('Lỗi: '+(e&&e.message?e.message:e),'err'); }).capNhatDsNNT(t);
}
function dienBuThieu(){
  var info=document.getElementById('dienBuInfo');
  if(!confirm('Điền bù dữ liệu còn thiếu cho TOÀN BỘ hồ sơ?\n\nChương trình chỉ điền vào ô đang trống, không ghi đè dữ liệu đã nhập tay.')) return;
  if(info) info.textContent='Đang xử lý…';
  batDangTai('Đang điền bù dữ liệu cho toàn bộ hồ sơ');
  google.script.run.withSuccessHandler(function(r){
    tatDangTai();
    if(!r.ok){ if(info)info.textContent=''; showMsg(r.msg,'err'); return; }
    if(info) info.innerHTML=(r.soODien?'✓ ':'')+r.msg;
    showMsg(r.msg, r.soODien?'ok':'err'); loadList();
  }).withFailureHandler(function(e){ tatDangTai(); if(info) info.textContent=''; showMsg('Lỗi khi điền bù: '+(e&&e.message?e.message:e),'err'); }).capNhatDuLieuConThieu();
}
function capNhatDL(){
  var t=document.getElementById('pasteUpdate').value;
  if(!t.trim()){ showMsg('Bạn chưa dán dữ liệu cần cập nhật.','err'); return; }
  document.getElementById('updateInfo').textContent='Đang cập nhật…';
  batDangTai('Đang cập nhật kho VPĐT');
  google.script.run.withSuccessHandler(function(r){
    tatDangTai();
    if(!r.ok){ document.getElementById('updateInfo').textContent=''; showMsg(r.msg,'err'); return; }
    document.getElementById('updateInfo').innerHTML='✓ '+r.msg;
    document.getElementById('pasteUpdate').value=''; showMsg(r.msg+' Giờ bạn có thể tra ID vừa thêm.','ok');
  }).withFailureHandler(function(e){ tatDangTai(); document.getElementById('updateInfo').textContent=''; showMsg(e.message,'err'); }).capNhatDuLieuVPDT(t);
}
function importFile(){
  var inp=document.getElementById('fileVPDT'); var info=document.getElementById('fileInfo');
  if(!inp.files||!inp.files.length){ showMsg('Bạn chưa chọn file.','err'); return; }
  if(typeof XLSX==='undefined'){ showMsg('Không tải được thư viện đọc file (mạng có thể chặn). Dùng Cách 2 (dán).','err'); return; }
  var file=inp.files[0]; info.textContent='Đang đọc file…'; batDangTai('Đang đọc file Excel');
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
      var ws=wb.Sheets[wb.SheetNames[0]];
      var grid=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
      var rows=extractFromGrid(grid);
      if(!rows.length){ tatDangTai(); info.textContent=''; showMsg('Không nhận ra dòng dữ liệu nào trong file. Kiểm tra file có đúng danh sách văn bản đi không.','err'); return; }
      var text=rows.map(function(r){return r.join('\t');}).join('\n');
      info.textContent='Đọc được '+rows.length+' hồ sơ, đang nạp…';
      google.script.run.withSuccessHandler(function(res){
        tatDangTai();
        if(!res.ok){ info.textContent=''; showMsg(res.msg,'err'); return; }
        info.innerHTML='✓ '+res.msg; inp.value=''; showMsg('Đã nạp từ file: '+res.msg,'ok');
      }).withFailureHandler(function(err){ tatDangTai(); info.textContent=''; showMsg(err.message,'err'); }).capNhatDuLieuVPDT(text, true);
    }catch(ex){ tatDangTai(); info.textContent=''; showMsg('Lỗi đọc file: '+ex.message,'err'); }
  };
  reader.onerror=function(){ tatDangTai(); info.textContent=''; showMsg('Không đọc được file.','err'); };
  reader.readAsArrayBuffer(file);
}
function extractFromGrid(grid){
  var hRow=-1;
  for(var r=0;r<grid.length;r++){
    var j=grid[r].map(function(x){return String(x||'').toLowerCase();}).join(' | ');
    if(j.indexOf('id văn bản')>=0 && j.indexOf('số phát hành')>=0){ hRow=r; break; }
  }
  if(hRow<0) return [];
  function col(keys){ var h=grid[hRow]; for(var c=0;c<h.length;c++){ var t=String(h[c]||'').toLowerCase().trim(); for(var k=0;k<keys.length;k++) if(t.indexOf(keys[k])>=0) return c; } return -1; }
  var ci={id:col(['id văn bản']),so:col(['số phát hành']),ngay:col(['ngày phát hành']),loai:col(['loại văn bản']),trich:col(['trích yếu']),mst:col(['mã số thuế']),nnt:col(['nơi nhận','tên nnt','người nộp thuế'])};
  if(ci.id<0||ci.so<0) return [];
  var out=[];
  for(var r2=hRow+1;r2<grid.length;r2++){
    var row=grid[r2];
    var id=String(ci.id>=0?(row[ci.id]||''):'').trim().replace(/\.0+$/,'');
    if(!id||!/\d/.test(id)) continue;
    out.push([ id, ci.so>=0?String(row[ci.so]||'').trim():'', ci.ngay>=0?String(row[ci.ngay]||'').trim():'',
      ci.loai>=0?String(row[ci.loai]||'').trim():'', ci.trich>=0?String(row[ci.trich]||'').trim():'',
      ci.mst>=0?String(row[ci.mst]||'').trim():'', ci.nnt>=0?String(row[ci.nnt]||'').trim():'' ]);
  }
  return out;
}
function moVPDTtheoO(key){ var id=String(getV(key)||'').trim(); if(!id){ showMsg('Ô này chưa có ID.','err'); return; } var t=document.getElementById('vpdtId'); if(t) t.value=id; openVPDT_(id); }
function moVPDT(){ openVPDT_(document.getElementById('vpdtId').value); }
function traCuuID(){
  var id=document.getElementById('vpdtId').value.trim();
  if(!id){ showMsg('Bạn chưa nhập ID văn bản.','err'); return; }
  document.getElementById('vpdtInfo').textContent='Đang tra cứu…';
  google.script.run.withSuccessHandler(function(r){
    if(!r.found){ document.getElementById('vpdtInfo').textContent=''; showMsg(r.msg+' Bạn có thể dùng cách dự phòng (dán tay) hoặc bấm "Mở VPĐT".','err'); return; }
    if(r.mst)setV('mst',r.mst); if(r.tencty)setV('tencty',r.tencty);
    if(r.soPhatHanh)setV(r.targetSo, r.soPhatHanh); if(r.ngayPhatHanh)setV(r.targetNgay, r.ngayPhatHanh);
    recalc(); updatePreview();
    var oTen={'soqdkt':'QĐKT','soklkt':'Kết luận','sotamhoan':'Tạm hoãn','sotamdung':'Tạm dừng','sogiahan':'Gia hạn'};
    document.getElementById('vpdtInfo').innerHTML='✓ Đã điền: <b>'+r.soPhatHanh+'</b> / '+r.ngayPhatHanh+' vào nhóm <b>'+(oTen[r.targetSo]||r.targetSo)+'</b>'+(r.mst?', MST '+r.mst:'')+(r.tencty?', '+r.tencty:'')+'. Loại VB: '+r.loaiVB;
  }).withFailureHandler(function(e){ document.getElementById('vpdtInfo').textContent=''; showMsg(e.message,'err'); }).lookupVPDTById(id);
}
function traTatCaID(){
  var idMap={};
  CFG.columns.forEach(function(c){ if(c.type==='idlookup') idMap[c.key]=getV(c.key); });
  var coId=Object.keys(idMap).some(function(k){return String(idMap[k]).trim();});
  if(!coId){ showMsg('Bạn chưa nhập ID nào ở nhóm ID.','err'); return; }
  var info=document.getElementById('idLookupInfo'); if(info) info.textContent='Đang tra…';
  batDangTai('Đang tra ID trong kho VPĐT');
  google.script.run.withSuccessHandler(function(r){
    tatDangTai();
    if(!r.ok){ if(info)info.textContent=''; showMsg(r.msg,'err'); return; }
    Object.keys(r.fills).forEach(function(k){ setV(k, r.fills[k]); });
    if(r.mst)setV('mst',r.mst); if(r.tencty)setV('tencty',r.tencty);
    recalc(); updatePreview();
    var coThieu=r.notFound && r.notFound.length;
    if(r.foundCount===0){
      if(info) info.innerHTML='<span style="color:#c5221f">Không tìm thấy ID nào trong kho VPĐT.</span> Bạn có thể: (1) nhập tay <b>Tên người nộp thuế</b>, số và ngày văn bản; hoặc (2) mở mục <b>Cập nhật dữ liệu VPĐT</b> để nạp thêm dữ liệu rồi tra lại.';
      var oTen=document.getElementById('f_tencty');
      if(oTen && !oTen.value){ oTen.focus(); oTen.scrollIntoView({behavior:'smooth',block:'center'}); }
      showMsg('Chưa có ID nào trong kho. Hãy nhập tay tên NNT hoặc cập nhật dữ liệu VPĐT.','err');
      return;
    }
    var msg='✓ Đã tra được '+r.foundCount+' ID, tự điền số & ngày tương ứng.';
    if(r.mst) msg+=' MST: '+r.mst+'.'; if(r.tencty) msg+=' Tên NNT đã điền.';
    if(coThieu) msg+='<br><span style="color:#b06000">Chưa có trong kho: '+r.notFound.map(function(x){return x.label+' ('+x.id+')';}).join(', ')+'. Bạn nhập tay số/ngày của các mục này, hoặc cập nhật dữ liệu VPĐT rồi tra lại.</span>';
    if(info) info.innerHTML=msg;
    if(!r.tencty){ var o2=document.getElementById('f_tencty'); if(o2 && !o2.value) showMsg('Đã tra xong. Kho chưa có tên NNT — bạn gõ tay ô Tên NNT.','ok'); else showMsg('Đã tra ID xong.','ok'); }
    else showMsg('Đã tra ID xong.'+(coThieu?' Có ID chưa có trong kho, xem chú thích.':''),'ok');
  }).withFailureHandler(function(e){ tatDangTai(); if(info)info.textContent=''; showMsg(e.message,'err'); }).lookupAllIds(idMap);
}
function collect(){
  var rec={};
  CFG.columns.forEach(function(c){
    var v=getV(c.key);
    if(c.type==='money'||c.type==='autocalc'){ v=String(v).replace(/[.,\s]/g,''); }
    else if(c.type==='date'){ v=sangVN(v); }
    rec[c.key]=v;
  });
  rec.loaitab=TAB_HIEN_TAI;
  if(rec.chuyende==='Khác'){ var o=document.getElementById('f_chuyende_khac'); var t=o?String(o.value||'').trim():''; if(t) rec.chuyende=t; }
  return rec;
}
function xoaCanhBao(){ CFG.columns.forEach(function(c){ var e=document.getElementById('f_'+c.key); if(e) e.classList.remove('loi'); var h=document.getElementById('err_'+c.key); if(h) h.remove(); }); }
function canhBaoO(key, thongdiep){
  var e=document.getElementById('f_'+key); if(!e) return;
  e.classList.add('loi'); var box=e.parentNode;
  var old=document.getElementById('err_'+key); if(old) old.remove();
  var d=document.createElement('div'); d.id='err_'+key; d.className='loi-text'; d.textContent=thongdiep; box.appendChild(d);
}
function ngayHopLe(s){
  var m=String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(!m) return false;
  var d=parseInt(m[1],10), mo=parseInt(m[2],10), y=parseInt(m[3],10);
  if(mo<1||mo>12) return false; if(d<1||d>31) return false; if(y<2000||y>2100) return false;
  var test=new Date(y,mo-1,d); return test.getDate()===d && (test.getMonth()+1)===mo;
}
var O_BAT_BUOC=['mst','tencty','truongdoan','tv1','loaihinh','kykt','kyhoan','kyhoan_sh','trangthai'];
function laBatBuoc(key){ return O_BAT_BUOC.indexOf(key)>=0; }
function kiemTraForm(rec){
  var loi=[]; xoaCanhBao();
  var mst=String(rec.mst||'').trim();
  if(!mst) loi.push({key:'mst', msg:'Bắt buộc nhập. MST gồm 10 chữ số, ví dụ: 0316055012'});
  else if(!/^\d{10}(-\d{3})?$/.test(mst)) loi.push({key:'mst', msg:'MST phải là 10 chữ số (chi nhánh thêm -3 số). Bạn đang nhập: "'+mst+'"'});
  [{key:'tencty',msg:'Bắt buộc nhập Tên NNT.'},{key:'truongdoan',msg:'Bắt buộc chọn Trưởng đoàn từ danh sách.'},
   {key:'tv1',msg:'Bắt buộc chọn Thành viên 1 từ danh sách.'},{key:'loaihinh',msg:'Bắt buộc chọn Loại hình kiểm tra.'},
   {key:'kykt',msg:'Bắt buộc nhập Kỳ kiểm tra, ví dụ: 2023-2024.'}].forEach(function(b){ if(!String(rec[b.key]||'').trim()) loi.push({key:b.key,msg:b.msg}); });
  var lkh=String(rec.loaikh||'').trim(); var cde=String(rec.chuyende||'').trim();
  if(/chuyên\s*đề/i.test(lkh) && !cde) loi.push({key:'chuyende', msg:'Đã chọn Loại kế hoạch là "Chuyên đề" nên bắt buộc chọn Tên chuyên đề.'});
  if(cde==='Khác'){ var oKhac=document.getElementById('f_chuyende_khac'); if(!oKhac || !String(oKhac.value||'').trim()) loi.push({key:'chuyende', msg:'Đã chọn "Khác" — hãy gõ tên chuyên đề cụ thể vào ô bên cạnh.'}); }
  var daCo={};
  ['truongdoan','phodoan','tv1','tv2','tv3','tv4'].forEach(function(k){
    var ten=String(rec[k]||'').trim(); if(!ten) return;
    if(daCo[ten]) loi.push({key:k, msg:'"'+ten+'" đã được chọn ở ô khác trong đoàn. Mỗi người chỉ giữ một vai trò.'});
    daCo[ten]=true;
  });
  CFG.columns.forEach(function(c){ if(c.type!=='date') return; var v=String(rec[c.key]||'').trim(); if(v && !ngayHopLe(v)) loi.push({key:c.key, msg:'Ngày không hợp lệ. Nhập theo dạng ngày/tháng/năm, ví dụ: 25/08/2026'}); });
  CFG.columns.forEach(function(c){ if(c.type!=='idlookup') return; var v=String(rec[c.key]||'').trim(); if(v && !/^\d+$/.test(v)) loi.push({key:c.key, msg:'ID văn bản chỉ gồm chữ số, ví dụ: 894369'}); });
  CFG.columns.forEach(function(c){ if(c.type!=='money') return; var raw=String(rec[c.key]||'').trim(); if(raw && (isNaN(Number(raw))||Number(raw)<0)) loi.push({key:c.key, msg:'Chỉ nhập số tiền dương, không nhập chữ hay dấu âm.'}); });
  return loi;
}
function nhanCot(key){ var c=CFG.columns.filter(function(x){return x.key===key;})[0]; return c?c.label:key; }
function luuHoSo(){
  var rec=collect(); var loi=kiemTraForm(rec);
  if(loi.length){
    loi.forEach(function(l){ canhBaoO(l.key, l.msg); });
    var dau=document.getElementById('f_'+loi[0].key); if(dau){ dau.focus(); dau.scrollIntoView({behavior:'smooth',block:'center'}); }
    showMsg('Có '+loi.length+' chỗ cần sửa. Xem chỉ dẫn màu đỏ dưới từng ô.','err'); return;
  }
  document.getElementById('btnSave').disabled=true; batDangTai('Đang lưu hồ sơ');
  google.script.run.withSuccessHandler(function(r){
    tatDangTai(); showMsg('✓ '+r.msg,'ok');
    document.getElementById('btnSave').disabled=false; resetForm(); loadList();
  }).withFailureHandler(function(e){ tatDangTai(); showMsg('Không lưu được: '+(e&&e.message?e.message:e),'err'); document.getElementById('btnSave').disabled=false; }).saveRecord(rec, EDIT_ROW);
}
function resetForm(){
  EDIT_ROW=null; document.getElementById('editBadge').style.display='none'; xoaCanhBao();
  CFG.columns.forEach(function(c){ var e=document.getElementById('f_'+c.key); if(e&&!e.readOnly) e.value=''; });
  var oKhac=document.getElementById('f_chuyende_khac'); if(oKhac){ oKhac.value=''; oKhac.style.display='none'; }
  var oLH=document.getElementById('f_loaihinh'); if(oLH) oLH.value=LOAI_MAC_DINH[TAB_HIEN_TAI]||'';
  var pv=document.getElementById('pasteVPDT'); if(pv) pv.value='';
  var pi=document.getElementById('pasteInfo'); if(pi) pi.textContent='';
  updatePreview();
}
function loadList(){
  var tb=document.getElementById('listBody');
  if(tb) tb.innerHTML='<tr><td colspan="7" class="loading">Đang tải danh sách…</td></tr>';
  google.script.run.withSuccessHandler(function(res){
    var tb=document.getElementById('listBody');
    if(!tb){ showMsg('Không tìm thấy bảng danh sách trên giao diện.','err'); return; }
    try{
      tb.innerHTML='';
      if(!res || !res.rows){ tb.innerHTML='<tr><td colspan="7" style="color:#c5221f">Máy chủ không trả về dữ liệu.</td></tr>'; return; }
      if(!res.rows.length){ tb.innerHTML='<tr><td colspan="7" class="loading">Chưa có hồ sơ nào bạn được xem.</td></tr>'; return; }
      res.rows.forEach(function(r){
        var tr=document.createElement('tr');
        tr.innerHTML='<td>'+(r.mst||'')+'</td><td>'+(r.tencty||'')+'</td><td>'+(r.truongdoan||'')+'</td><td>'+(r.loaihinh||'')+'</td><td>'+(r.soqdkt||'')+'</td><td class="money">'+money(r.tongcong)+'</td><td><button class="btn small sec" onclick="editRow('+r._row+')">Sửa</button></td>';
        tb.appendChild(tr);
      });
    }catch(err){ tb.innerHTML='<tr><td colspan="7" style="color:#c5221f;padding:12px">Lỗi hiển thị danh sách: '+err.message+'</td></tr>'; }
  }).withFailureHandler(function(e){
    var tb=document.getElementById('listBody'); var msg=(e&&e.message)?e.message:String(e);
    if(tb) tb.innerHTML='<tr><td colspan="7" style="color:#c5221f;padding:12px">Lỗi gọi máy chủ: '+msg+'</td></tr>';
  }).getRecords(null);
}
function editRow(rowNum){
  google.script.run.withSuccessHandler(function(res){
    var rec=res.rows.filter(function(x){return x._row===rowNum;})[0];
    if(!rec){ showMsg('Không tìm thấy hồ sơ.','err'); return; }
    fillFormFromRecord(rec);
  }).getRecords(null);
}
function fillFormFromRecord(rec){
  EDIT_ROW=rec._row;
  var tabHS=tabCuaHoSo(rec);
  if(tabHS!==TAB_HIEN_TAI){ TAB_HIEN_TAI=tabHS; toSangTab(); buildForm(); }
  document.getElementById('editBadge').style.display='inline-block';
  document.getElementById('editRow').textContent=rec._row;
  CFG.columns.forEach(function(c){
    var e=document.getElementById('f_'+c.key); if(!e) return;
    var v=rec[c.key];
    if(c.type==='money'||c.type==='autocalc'){ var so=String(v==null?'':v).replace(/\D/g,''); v=so?so.replace(/\B(?=(\d{3})+(?!\d))/g,'.'):''; }
    else if(c.type==='date'){ v=sangISO(v); }
    e.value=(v===0||v)?v:'';
  });
  var sel=document.getElementById('f_chuyende'); var oKhac=document.getElementById('f_chuyende_khac');
  if(sel && oKhac){
    var giatri=String(rec.chuyende||'').trim();
    var coTrongDS=Array.prototype.some.call(sel.options,function(o){return o.value===giatri;});
    if(giatri && !coTrongDS){ sel.value='Khác'; oKhac.style.display='block'; oKhac.value=giatri; }
    else { oKhac.style.display='none'; oKhac.value=''; }
  }
  updatePreview();
  var tt=String(rec.trangthai||'').trim().toLowerCase();
  var btn=document.getElementById('btnSave');
  if(tt==='hoàn thành'){
    if(btn){ btn.disabled=true; btn.textContent='🔒 Hồ sơ đã hoàn thành'; }
    showMsg('Hồ sơ này ở trạng thái HOÀN THÀNH nên không sửa được. Liên hệ admin nếu cần mở khóa.','err');
  } else { if(btn && CFG.user.vaitro!=='guest'){ btn.disabled=false; btn.textContent='💾 Lưu hồ sơ'; } }
  window.scrollTo({top:0,behavior:'smooth'});
}
function timHoSo(){
  var mst=document.getElementById('searchMST').value.trim();
  if(!mst){ showMsg('Bạn chưa nhập MST.','err'); return; }
  document.getElementById('searchInfo').textContent='Đang tìm…';
  document.getElementById('searchResults').innerHTML='';
  google.script.run.withSuccessHandler(function(r){
    document.getElementById('searchInfo').textContent=r.msg;
    if(!r.ok||!r.rows||!r.rows.length) return;
    var html='<table class="list"><thead><tr><th>MST</th><th>Tên NNT</th><th>Trưởng đoàn</th><th>Loại hình</th><th>Số QĐKT</th><th></th></tr></thead><tbody>';
    r.rows.forEach(function(rec){
      html+='<tr><td>'+(rec.mst||'')+'</td><td>'+(rec.tencty||'')+'</td><td>'+(rec.truongdoan||'')+'</td><td>'+(rec.loaihinh||'')+'</td><td>'+(rec.soqdkt||'')+'</td><td><button class="btn small" onclick=\'suaHoSo('+rec._row+')\'>✏️ Sửa hồ sơ này</button></td></tr>';
    });
    html+='</tbody></table>';
    document.getElementById('searchResults').innerHTML=html;
    window._searchRows=r.rows;
  }).withFailureHandler(function(e){ document.getElementById('searchInfo').textContent=''; showMsg(e.message,'err'); }).findByMST(mst);
}
function suaHoSo(rowNum){
  var rec=(window._searchRows||[]).filter(function(x){return x._row===rowNum;})[0];
  if(!rec){ showMsg('Không tìm thấy hồ sơ.','err'); return; }
  fillFormFromRecord(rec);
  showMsg('Đã nạp hồ sơ MST '+rec.mst+' vào form. Sửa xong bấm Lưu.','ok');
}
function showMsg(t,cls){ var m=document.getElementById('msg'); m.textContent=t; m.className='msg '+cls; if(cls==='ok') setTimeout(function(){ m.className='msg'; },4000); }

/* ====================== ĐĂNG NHẬP / ĐĂNG XUẤT ====================== */
async function dangNhap(ev){
  if(ev) ev.preventDefault();
  var email=document.getElementById('dnEmail').value.trim();
  var mk=document.getElementById('dnMatKhau').value;
  var loi=document.getElementById('dnLoi');
  if(!email||!mk){ loi.textContent='Nhập đủ email và mật khẩu.'; loi.style.display='block'; return; }
  loi.style.display='none';
  document.getElementById('btnDangNhap').disabled=true;
  var {data,error}=await SB.auth.signInWithPassword({email:email, password:mk});
  document.getElementById('btnDangNhap').disabled=false;
  if(error){ loi.textContent='Đăng nhập không thành công: '+error.message; loi.style.display='block'; return; }
  USER.email=(data.user&&data.user.email)||email;
  hienApp();
}
async function dangXuat(){
  await SB.auth.signOut();
  location.reload();
}
function hienApp(){
  document.getElementById('manHinhDangNhap').style.display='none';
  document.getElementById('appChinh').style.display='block';
  document.getElementById('btnDangXuat').style.display='inline-block';
  khoiDongApp();
}
function hienDangNhap(){
  document.getElementById('manHinhDangNhap').style.display='flex';
  document.getElementById('appChinh').style.display='none';
  document.getElementById('btnDangXuat').style.display='none';
}
// Khi mở trang: kiểm tra đã đăng nhập chưa
document.addEventListener('DOMContentLoaded', async function(){
  try{
    var {data}=await SB.auth.getSession();
    if(data && data.session && data.session.user){ USER.email=data.session.user.email; hienApp(); }
    else hienDangNhap();
  }catch(e){ hienDangNhap(); }
});
