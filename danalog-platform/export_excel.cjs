const XLSX = require('./frontend/node_modules/xlsx-js-style');
const db = require('./frontend/db.json');
const wb = XLSX.utils.book_new();

// Styles
const hdr = { font:{name:'Times New Roman',sz:11,bold:true}, alignment:{horizontal:'center',vertical:'center',wrapText:true}, border:{top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}, fill:{fgColor:{rgb:'D9E2F3'}} };
const cl = { font:{name:'Times New Roman',sz:11}, alignment:{horizontal:'left',vertical:'center',wrapText:true}, border:{top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}} };
const cc = { font:{name:'Times New Roman',sz:11}, alignment:{horizontal:'center',vertical:'center'}, border:{top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}} };
const cr = { font:{name:'Times New Roman',sz:11}, alignment:{horizontal:'right',vertical:'center'}, border:{top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}, numFmt:'#,##0' };
const variantStyle = { font:{name:'Times New Roman',sz:11,italic:true,color:{rgb:'888888'}}, alignment:{horizontal:'left',vertical:'center',wrapText:true}, border:{top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}, fill:{fgColor:{rgb:'F2F2F2'}} };

// ===== SHEET 1: TUYEN DUONG =====
const variants = ['RT-080','RT-081','RT-083','RT-086'];
const excluded = ['RT-101','RT-102','RT-103'];
const routes = db.routeConfigs.filter(r => !excluded.includes(r.id));

const routeRows = [
  [{v:'STT',s:hdr},{v:'Mã tuyến',s:hdr},{v:'Tên tuyến đường',s:hdr},{v:'Khách hàng',s:hdr},{v:'Loại hàng',s:hdr},{v:'Giá 40F',s:hdr},{v:'Giá 40E',s:hdr},{v:'Giá 20F',s:hdr},{v:'Giá 20E',s:hdr},{v:'Lương tài xế',s:hdr},{v:'Phụ cấp',s:hdr},{v:'Định mức dầu (L)',s:hdr},{v:'Loại xe',s:hdr},{v:'Ngày hiệu lực',s:hdr},{v:'Trạng thái',s:hdr},{v:'Ghi chú',s:hdr}]
];

let stt = 0;
routes.forEach(r => {
  stt++;
  const isVar = variants.includes(r.id);
  const parentMap = {'RT-080':'RT-079','RT-081':'RT-079','RT-083':'RT-082','RT-086':'RT-085'};
  const note = isVar ? 'Bien the cua ' + parentMap[r.id] : '';
  const s = isVar ? variantStyle : cl;
  routeRows.push([
    {v:stt,t:'n',s:cc}, {v:r.id,s:cc}, {v:r.routeName,s:s}, {v:r.customer,s:s},
    {v:r.cargoType,s:cc},
    {v:r.revenue?.price40F||0,t:'n',s:cr}, {v:r.revenue?.price40E||0,t:'n',s:cr},
    {v:r.revenue?.price20F||0,t:'n',s:cr}, {v:r.revenue?.price20E||0,t:'n',s:cr},
    {v:r.salary?.driverSalary||0,t:'n',s:cr}, {v:r.salary?.surcharge||0,t:'n',s:cr},
    {v:r.fuel?.quota||0,t:'n',s:cc}, {v:r.fuel?.truckType||'',s:cc},
    {v:r.effectiveDate||'',s:cc}, {v:r.status||'',s:cc}, {v:note,s:cl}
  ]);
});

const ws1 = XLSX.utils.aoa_to_sheet(routeRows);
ws1['!cols'] = [{wch:5},{wch:9},{wch:55},{wch:20},{wch:18},{wch:12},{wch:12},{wch:12},{wch:12},{wch:14},{wch:10},{wch:14},{wch:10},{wch:14},{wch:10},{wch:22}];
XLSX.utils.book_append_sheet(wb, ws1, 'Tuyen Duong (37 tuyen)');

// ===== SHEET 2: LUU DEM =====
const nightRows = [
  [{v:'Mã',s:hdr},{v:'Khu vực',s:hdr},{v:'Vị trí',s:hdr},{v:'Đơn giá lưu đêm',s:hdr},{v:'Ngày hiệu lực',s:hdr}]
];
db.routeConfigs.filter(r => r.cargoType === 'LUU_DEM').forEach(r => {
  nightRows.push([
    {v:r.id,s:cc},{v:r.routeName,s:cl},{v:r.nightStayLocation||'',s:cc},
    {v:r.salary?.driverSalary||0,t:'n',s:cr},{v:r.effectiveDate||'',s:cc}
  ]);
});
const ws2 = XLSX.utils.aoa_to_sheet(nightRows);
ws2['!cols'] = [{wch:8},{wch:15},{wch:15},{wch:18},{wch:14}];
XLSX.utils.book_append_sheet(wb, ws2, 'Cau Hinh Luu Dem');

// ===== SHEET 3: KHACH HANG =====
const custRows = [
  [{v:'STT',s:hdr},{v:'Mã KH',s:hdr},{v:'Code',s:hdr},{v:'Tên hiển thị',s:hdr},{v:'Trạng thái',s:hdr}]
];
(db.customers||[]).forEach((c,i) => {
  custRows.push([{v:i+1,t:'n',s:cc},{v:c.id,s:cc},{v:c.code,s:cl},{v:c.name,s:cl},{v:c.status,s:cc}]);
});
const ws3 = XLSX.utils.aoa_to_sheet(custRows);
ws3['!cols'] = [{wch:5},{wch:12},{wch:18},{wch:22},{wch:10}];
XLSX.utils.book_append_sheet(wb, ws3, 'Khach Hang (12)');

// ===== SHEET 4: NGUOI DUNG =====
const userRows = [
  [{v:'STT',s:hdr},{v:'Username',s:hdr},{v:'Họ tên',s:hdr},{v:'Vai trò',s:hdr},{v:'Tên vai trò',s:hdr},{v:'Biển số xe',s:hdr},{v:'Mật khẩu đã hash',s:hdr}]
];
const roleLabels = {ADMIN:'Quản trị viên',CS:'Nhân viên CS',CS_LEAD:'Trưởng phòng CS',DISPATCHER:'Điều phối viên',DV_LEAD:'Trưởng phòng ĐV',ACCOUNTANT:'Kế toán',DRIVER:'Lái xe'};
(db.users||[]).forEach((u,i) => {
  const hashed = (u.password||'').startsWith('$2a$') || (u.password||'').startsWith('$2b$');
  userRows.push([
    {v:i+1,t:'n',s:cc},{v:u.username,s:cl},{v:u.name,s:cl},{v:u.role,s:cc},
    {v:roleLabels[u.role]||u.role,s:cl},{v:u.licensePlate||'—',s:cc},{v:hashed?'bcrypt (an toàn)':'plain (chưa hash)',s:cc}
  ]);
});
const ws4 = XLSX.utils.aoa_to_sheet(userRows);
ws4['!cols'] = [{wch:5},{wch:14},{wch:22},{wch:14},{wch:20},{wch:14},{wch:18}];
XLSX.utils.book_append_sheet(wb, ws4, 'Nguoi Dung (12)');

// ===== SHEET 5: MA VUNG DIA LY =====
const areaData = [
  ['TIEN_SA','Cảng','Tiên Sa, Tien Sa'],['LIEN_CHIEU','Cảng','Liên Chiểu, Lien Chieu'],
  ['CHU_LAI','Cảng','Chu Lai'],['QUY_NHON','Cảng','Quy Nhơn, Quy Nhon'],['CHAN_MAY','Cảng','Chân Mây, Chan May'],
  ['LAO_BAO','Cửa khẩu','Lao Bảo, Lao Bao'],['BO_Y','Cửa khẩu','Bờ Y, Bo Y'],['LA_LAY','Cửa khẩu','La Lay'],
  ['HOA_KHANH','KCN','Hòa Khánh, Hoa Khanh'],['DIEN_NAM','KCN','Điện Ngọc, Dien Ngoc, Điện Nam'],
  ['KCN_DANANG','KCN','VSIP, KCN'],['DUNG_QUAT','KCN','Dung Quất, Dung Quat'],
  ['DANANG','Thành phố','Đà Nẵng, Da Nang, Danang'],['HUE','Thành phố','Huế, Hue'],
  ['QUANG_TRI','Thành phố','Quảng Trị, Quang Tri'],['QUANG_NGAI','Thành phố','Quảng Ngãi, Quang Ngai'],
  ['LAOS','Quốc tế','Savannakhet, Lào, Lao']
];
const areaRows = [[{v:'Mã vùng chuẩn',s:hdr},{v:'Loại',s:hdr},{v:'Tên nhận diện (input)',s:hdr},{v:'Nhóm lân cận',s:hdr}]];
const regionMap = {'TIEN_SA':'Đà Nẵng Metro','LIEN_CHIEU':'Đà Nẵng Metro','HOA_KHANH':'Đà Nẵng Metro','KCN_DANANG':'Đà Nẵng Metro','DANANG':'Đà Nẵng Metro','DIEN_NAM':'Quảng Nam','CHU_LAI':'Quảng Nam','DUNG_QUAT':'Quảng Nam','HUE':'Huế-Quảng Trị','CHAN_MAY':'Huế-Quảng Trị','QUANG_TRI':'Huế-Quảng Trị','LAO_BAO':'Huế-Quảng Trị / Biên giới Lào','LA_LAY':'Huế-Quảng Trị','QUY_NHON':'Phía Nam','QUANG_NGAI':'Phía Nam','LAOS':'Biên giới Lào'};
areaData.forEach(a => {
  areaRows.push([{v:a[0],s:cl},{v:a[1],s:cc},{v:a[2],s:cl},{v:regionMap[a[0]]||'',s:cl}]);
});
const ws5 = XLSX.utils.aoa_to_sheet(areaRows);
ws5['!cols'] = [{wch:14},{wch:12},{wch:35},{wch:25}];
XLSX.utils.book_append_sheet(wb, ws5, 'Ma Vung Dia Ly (17)');

// ===== SHEET 6: DISPATCH CONFIG =====
const cfgRows = [
  [{v:'Tham số',s:hdr},{v:'Giá trị',s:hdr},{v:'Đơn vị',s:hdr},{v:'Mô tả',s:hdr}],
  [{v:'Continuity Weight',s:cl},{v:db.dispatch_config?.continuity_weight||40,t:'n',s:cc},{v:'%',s:cc},{v:'Trọng số tính liên tục (tài xế gần điểm lấy hàng)',s:cl}],
  [{v:'Availability Weight',s:cl},{v:db.dispatch_config?.availability_weight||25,t:'n',s:cc},{v:'%',s:cc},{v:'Trọng số khả dụng (tài xế đang rảnh)',s:cl}],
  [{v:'Route Experience Weight',s:cl},{v:db.dispatch_config?.route_weight||15,t:'n',s:cc},{v:'%',s:cc},{v:'Trọng số kinh nghiệm tuyến',s:cl}],
  [{v:'Performance Weight',s:cl},{v:db.dispatch_config?.performance_weight||10,t:'n',s:cc},{v:'%',s:cc},{v:'Trọng số hiệu suất',s:cl}],
  [{v:'Load Balance Weight',s:cl},{v:db.dispatch_config?.balance_weight||10,t:'n',s:cc},{v:'%',s:cc},{v:'Trọng số cân bằng tải',s:cl}],
  [{v:'',s:cl},{v:'',s:cc},{v:'',s:cc},{v:'',s:cl}],
  [{v:'Driver Response Time',s:cl},{v:db.sla_config?.driverResponseTime||3,t:'n',s:cc},{v:'phút',s:cc},{v:'Thời gian chờ phản hồi tài xế',s:cl}],
  [{v:'Max Assignment Cycles',s:cl},{v:db.sla_config?.maxAssignmentCycles||3,t:'n',s:cc},{v:'vòng',s:cc},{v:'Số vòng escalate tối đa',s:cl}],
];
const ws6 = XLSX.utils.aoa_to_sheet(cfgRows);
ws6['!cols'] = [{wch:25},{wch:10},{wch:8},{wch:45}];
XLSX.utils.book_append_sheet(wb, ws6, 'Cau Hinh AI Dispatch');

// ===== WRITE =====
const outPath = '/Users/macbook/Downloads/danalog-main/Du_Lieu_Da_Xu_Ly_Danalog.xlsx';
XLSX.writeFile(wb, outPath);
console.log('Done:', outPath);
console.log('Sheets:', wb.SheetNames.join(', '));
console.log('Routes:', routes.length, '(37 unique, 4 variants marked)');
