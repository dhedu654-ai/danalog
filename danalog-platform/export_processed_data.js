/**
 * DANALOG - Export Dữ Liệu Đã Xử Lý & Làm Sạch
 * ================================================
 * Script này đọc toàn bộ dữ liệu đã xử lý từ db.json và server.js,
 * phân loại, đánh dấu, và xuất ra file JSON + Markdown tổng hợp.
 * 
 * Chạy: node export_processed_data.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'frontend', 'db.json');
const outputJsonPath = path.join(__dirname, 'du_lieu_da_xu_ly.json');
const outputMdPath = path.join(__dirname, 'du_lieu_da_xu_ly.md');

// ============================================================
// 1. ĐỌC DỮ LIỆU GỐC
// ============================================================
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

// ============================================================
// 2. XỬ LÝ ROUTE CONFIGS
// ============================================================
const allRoutes = db.routeConfigs || [];

// Phân loại
const nightStayConfigs = allRoutes.filter(r => r.cargoType === 'LUU_DEM');
const catchAllRoutes = allRoutes.filter(r => r.routeName === 'Tuyến đường khác');
const transportRoutes = allRoutes.filter(r => r.cargoType !== 'LUU_DEM' && r.routeName !== 'Tuyến đường khác');

// Phát hiện trùng tên
const routeNameCount = {};
transportRoutes.forEach(r => {
    routeNameCount[r.routeName] = (routeNameCount[r.routeName] || 0) + 1;
});
const duplicateRouteNames = Object.entries(routeNameCount).filter(([_, count]) => count > 1).map(([name]) => name);

// Đánh dấu unique vs duplicate
const processedRoutes = transportRoutes.map(r => ({
    ...r,
    _category: classifyRoute(r),
    _isDuplicate: duplicateRouteNames.includes(r.routeName),
    _priceRange: getPriceRange(r),
}));

function classifyRoute(route) {
    const customer = route.customer || '';
    const cargo = route.cargoType || '';
    
    if (cargo.startsWith('TR_C')) return 'TRUNG_CHUYEN';
    if (cargo.startsWith('KHO')) return 'KHO_HANG';
    if (cargo === 'VC_GIAY') return 'VAN_CHUYEN_GIAY';
    if (cargo === 'VC_BOT') return 'VAN_CHUYEN_BOT';
    if (cargo === 'VC_CONT') return 'VAN_CHUYEN_CONT';
    return 'KHAC';
}

function getPriceRange(route) {
    const rev = route.revenue || {};
    const prices = [rev.price40F, rev.price40E, rev.price20F, rev.price20E].filter(p => p > 0);
    if (prices.length === 0) return { min: 0, max: 0, hasRevenue: false };
    return {
        min: Math.min(...prices),
        max: Math.max(...prices),
        hasRevenue: true
    };
}

// ============================================================
// 3. XỬ LÝ USERS
// ============================================================
const users = (db.users || []).map(u => ({
    username: u.username,
    name: u.name,
    role: u.role,
    licensePlate: u.licensePlate || null,
    status: u.status || 'ACTIVE',
    _passwordHashed: u.password?.startsWith('$2a$') || u.password?.startsWith('$2b$'),
    _roleLabel: getRoleLabel(u.role),
}));

function getRoleLabel(role) {
    const labels = {
        ADMIN: 'Quản trị viên',
        CS: 'Nhân viên CS',
        CS_LEAD: 'Trưởng phòng CS',
        DISPATCHER: 'Điều phối viên',
        DV_LEAD: 'Trưởng phòng Điều vận',
        ACCOUNTANT: 'Kế toán',
        DRIVER: 'Lái xe',
    };
    return labels[role] || role;
}

// ============================================================
// 4. XỬ LÝ CUSTOMERS
// ============================================================
const customers = (db.customers || []).map(c => ({
    id: c.id,
    code: c.code,
    name: c.name,
    status: c.status,
}));

// ============================================================
// 5. XỬ LÝ DISPATCH CONFIG
// ============================================================
const dispatchConfig = db.dispatch_config || {};
const slaConfig = db.sla_config || {};

// ============================================================
// 6. CHUẨN HÓA VÙNG ĐỊA LÝ (từ logic suggest.js)
// ============================================================
const areaNormalization = [
    { patterns: ['Tiên Sa', 'Tien Sa'], code: 'TIEN_SA', type: 'Cảng' },
    { patterns: ['Liên Chiểu', 'Lien Chieu'], code: 'LIEN_CHIEU', type: 'Cảng' },
    { patterns: ['Chu Lai'], code: 'CHU_LAI', type: 'Cảng' },
    { patterns: ['Quy Nhơn', 'Quy Nhon'], code: 'QUY_NHON', type: 'Cảng' },
    { patterns: ['Chân Mây', 'Chan May'], code: 'CHAN_MAY', type: 'Cảng' },
    { patterns: ['Lao Bảo', 'Lao Bao'], code: 'LAO_BAO', type: 'Cửa khẩu' },
    { patterns: ['Bờ Y', 'Bo Y'], code: 'BO_Y', type: 'Cửa khẩu' },
    { patterns: ['La Lay'], code: 'LA_LAY', type: 'Cửa khẩu' },
    { patterns: ['Hòa Khánh', 'Hoa Khanh'], code: 'HOA_KHANH', type: 'KCN' },
    { patterns: ['Điện Ngọc', 'Dien Ngoc', 'Điện Nam'], code: 'DIEN_NAM', type: 'KCN' },
    { patterns: ['VSIP', 'KCN'], code: 'KCN_DANANG', type: 'KCN' },
    { patterns: ['Dung Quất', 'Dung Quat'], code: 'DUNG_QUAT', type: 'KCN' },
    { patterns: ['Đà Nẵng', 'Da Nang', 'Danang'], code: 'DANANG', type: 'Thành phố' },
    { patterns: ['Huế', 'Hue'], code: 'HUE', type: 'Thành phố' },
    { patterns: ['Quảng Trị', 'Quang Tri'], code: 'QUANG_TRI', type: 'Thành phố' },
    { patterns: ['Quảng Ngãi', 'Quang Ngai'], code: 'QUANG_NGAI', type: 'Thành phố' },
    { patterns: ['Savannakhet', 'Lào', 'Lao'], code: 'LAOS', type: 'Quốc tế' },
];

const regionGroups = [
    { name: 'Đà Nẵng Metro', areas: ['TIEN_SA', 'LIEN_CHIEU', 'HOA_KHANH', 'KCN_DANANG', 'DANANG'] },
    { name: 'Quảng Nam', areas: ['DIEN_NAM', 'CHU_LAI', 'DUNG_QUAT'] },
    { name: 'Huế - Quảng Trị', areas: ['HUE', 'CHAN_MAY', 'QUANG_TRI', 'LAO_BAO', 'LA_LAY'] },
    { name: 'Phía Nam', areas: ['QUY_NHON', 'QUANG_NGAI'] },
    { name: 'Biên giới Lào', areas: ['LAO_BAO', 'LAOS'] },
];

// ============================================================
// 7. THỐNG KÊ TỔNG HỢP
// ============================================================
const stats = {
    totalRouteRecords: allRoutes.length,
    transportRoutes: transportRoutes.length,
    nightStayConfigs: nightStayConfigs.length,
    catchAllRoutes: catchAllRoutes.length,
    uniqueTransportRouteNames: new Set(transportRoutes.map(r => r.routeName)).size,
    duplicateRouteNames: duplicateRouteNames,
    
    totalUsers: users.length,
    usersByRole: {},
    driversCount: users.filter(u => u.role === 'DRIVER').length,
    
    totalCustomers: customers.length,
    
    routesByCategory: {},
    routesByCustomer: {},
    
    fuelQuotaRange: {
        min: Math.min(...transportRoutes.map(r => r.fuel?.quota || 0)),
        max: Math.max(...transportRoutes.map(r => r.fuel?.quota || 0)),
    },
    salaryRange: {
        min: Math.min(...transportRoutes.map(r => r.salary?.driverSalary || 0)),
        max: Math.max(...transportRoutes.map(r => r.salary?.driverSalary || 0)),
    },
};

users.forEach(u => {
    stats.usersByRole[u.role] = (stats.usersByRole[u.role] || 0) + 1;
});

processedRoutes.forEach(r => {
    stats.routesByCategory[r._category] = (stats.routesByCategory[r._category] || 0) + 1;
    const cust = r.customer || 'N/A';
    stats.routesByCustomer[cust] = (stats.routesByCustomer[cust] || 0) + 1;
});

// ============================================================
// 8. XUẤT FILE JSON
// ============================================================
const exportData = {
    _metadata: {
        exportedAt: new Date().toISOString(),
        source: 'danalog-platform/frontend/db.json',
        description: 'Dữ liệu đã xử lý và làm sạch cho hệ thống quản lý vận tải Danalog',
        version: '1.0',
    },
    statistics: stats,
    routeConfigs: {
        transportRoutes: processedRoutes,
        nightStayConfigs: nightStayConfigs,
        catchAllRoutes: catchAllRoutes,
    },
    users: users,
    customers: customers,
    dispatchConfig: dispatchConfig,
    slaConfig: slaConfig,
    areaNormalization: areaNormalization,
    regionGroups: regionGroups,
};

fs.writeFileSync(outputJsonPath, JSON.stringify(exportData, null, 2), 'utf-8');
console.log(`✅ Đã xuất JSON: ${outputJsonPath}`);

// ============================================================
// 9. XUẤT FILE MARKDOWN
// ============================================================
let md = '';

md += `# DỮ LIỆU ĐÃ XỬ LÝ & LÀM SẠCH — HỆ THỐNG DANALOG\n\n`;
md += `> **Ngày xuất:** ${new Date().toLocaleString('vi-VN')}\n\n`;
md += `---\n\n`;

// --- THỐNG KÊ ---
md += `## I. THỐNG KÊ TỔNG HỢP\n\n`;
md += `| Chỉ tiêu | Giá trị |\n|----------|--------|\n`;
md += `| Tổng bản ghi RouteConfig | ${stats.totalRouteRecords} |\n`;
md += `| → Tuyến vận chuyển | ${stats.transportRoutes} |\n`;
md += `| → Tên tuyến duy nhất (không trùng) | ${stats.uniqueTransportRouteNames} |\n`;
md += `| → Cấu hình lưu đêm | ${stats.nightStayConfigs} |\n`;
md += `| → Tuyến catch-all | ${stats.catchAllRoutes} |\n`;
md += `| Tổng Users | ${stats.totalUsers} |\n`;
md += `| → Tài xế | ${stats.driversCount} |\n`;
md += `| Tổng khách hàng | ${stats.totalCustomers} |\n`;
md += `| Lương tài xế (min-max) | ${stats.salaryRange.min.toLocaleString()}đ – ${stats.salaryRange.max.toLocaleString()}đ |\n`;
md += `| Định mức dầu (min-max) | ${stats.fuelQuotaRange.min}L – ${stats.fuelQuotaRange.max}L |\n\n`;

if (stats.duplicateRouteNames.length > 0) {
    md += `**Tuyến trùng tên:** ${stats.duplicateRouteNames.join(', ')}\n\n`;
}

md += `### Phân bổ vai trò\n\n`;
md += `| Vai trò | Số lượng |\n|---------|--------|\n`;
Object.entries(stats.usersByRole).forEach(([role, count]) => {
    const label = getRoleLabel(role);
    md += `| ${label} (${role}) | ${count} |\n`;
});
md += `\n`;

md += `### Phân bổ tuyến theo loại hàng\n\n`;
md += `| Loại hàng | Số tuyến |\n|-----------|--------|\n`;
const categoryLabels = {
    TRUNG_CHUYEN: 'Trung chuyển nội bộ',
    KHO_HANG: 'Kho hàng',
    VAN_CHUYEN_GIAY: 'Vận chuyển giấy',
    VAN_CHUYEN_BOT: 'Vận chuyển bột',
    VAN_CHUYEN_CONT: 'Vận chuyển container',
    KHAC: 'Khác',
};
Object.entries(stats.routesByCategory).forEach(([cat, count]) => {
    md += `| ${categoryLabels[cat] || cat} | ${count} |\n`;
});
md += `\n`;

// --- TUYẾN ĐƯỜNG ---
md += `---\n\n## II. DANH SÁCH TUYẾN ĐƯỜNG VẬN CHUYỂN (${transportRoutes.length} bản ghi, ${stats.uniqueTransportRouteNames} tên duy nhất)\n\n`;
md += `| STT | Mã | Tên tuyến | Khách hàng | Loại hàng | Lương TX | Dầu (L) | Giá 40F | Giá 20F | Ghi chú |\n`;
md += `|-----|-----|-----------|-----------|-----------|---------|---------|---------|---------|--------|\n`;

processedRoutes.forEach((r, i) => {
    const rev = r.revenue || {};
    const note = r._isDuplicate ? '⚠️ Trùng tên' : '';
    md += `| ${i + 1} | ${r.id} | ${r.routeName} | ${r.customer} | ${r.cargoType} | ${(r.salary?.driverSalary || 0).toLocaleString()} | ${r.fuel?.quota || 0} | ${(rev.price40F || 0).toLocaleString()} | ${(rev.price20F || 0).toLocaleString()} | ${note} |\n`;
});
md += `\n`;

// --- CẤU HÌNH LƯU ĐÊM ---
md += `---\n\n## III. CẤU HÌNH LƯU ĐÊM (${nightStayConfigs.length} bản ghi)\n\n`;
md += `| Mã | Khu vực | Đơn giá lưu đêm |\n|-----|---------|----------------|\n`;
nightStayConfigs.forEach(r => {
    md += `| ${r.id} | ${r.routeName} (${r.nightStayLocation}) | ${(r.salary?.driverSalary || 0).toLocaleString()}đ/đêm |\n`;
});
md += `\n`;

// --- USERS ---
md += `---\n\n## IV. DANH SÁCH NGƯỜI DÙNG (${users.length} user)\n\n`;
md += `| STT | Username | Họ tên | Vai trò | Biển số xe | Mật khẩu đã hash |\n`;
md += `|-----|----------|--------|---------|-----------|------------------|\n`;
users.forEach((u, i) => {
    md += `| ${i + 1} | ${u.username} | ${u.name} | ${u._roleLabel} (${u.role}) | ${u.licensePlate || '—'} | ${u._passwordHashed ? '✅ bcrypt' : '❌ plain'} |\n`;
});
md += `\n`;

// --- CUSTOMERS ---
md += `---\n\n## V. DANH MỤC KHÁCH HÀNG (${customers.length} khách)\n\n`;
md += `| STT | Mã | Code | Tên hiển thị | Trạng thái | Số tuyến |\n`;
md += `|-----|-----|------|-------------|-----------|--------|\n`;
customers.forEach((c, i) => {
    const routeCount = stats.routesByCustomer[c.name] || 0;
    md += `| ${i + 1} | ${c.id} | ${c.code} | ${c.name} | ${c.status} | ${routeCount} |\n`;
});
md += `\n`;

// --- DISPATCH CONFIG ---
md += `---\n\n## VI. CẤU HÌNH THUẬT TOÁN ĐIỀU PHỐI AI\n\n`;
md += `### Trọng số Scoring (5 tiêu chí)\n\n`;
md += `| Tiêu chí | Trọng số | Mô tả |\n|----------|---------|-------|\n`;
md += `| Continuity (Tính liên tục) | ${dispatchConfig.continuity_weight || 40}% | Tài xế vừa hoàn thành chuyến gần điểm lấy hàng mới |\n`;
md += `| Availability (Khả dụng) | ${dispatchConfig.availability_weight || 25}% | Tài xế đang rảnh hay đang bận |\n`;
md += `| Route Experience (Kinh nghiệm tuyến) | ${dispatchConfig.route_weight || 15}% | Số lần tài xế đã chạy tuyến này |\n`;
md += `| Performance (Hiệu suất) | ${dispatchConfig.performance_weight || 10}% | Tỷ lệ hoàn thành, tỷ lệ từ chối |\n`;
md += `| Load Balance (Cân bằng tải) | ${dispatchConfig.balance_weight || 10}% | Phân bổ đều giữa các tài xế |\n\n`;

md += `### Cấu hình SLA\n\n`;
md += `| Tham số | Giá trị | Mô tả |\n|---------|---------|-------|\n`;
md += `| Thời gian phản hồi tài xế | ${slaConfig.driverResponseTime || 30} phút | Sau thời gian này → NO_RESPONSE |\n`;
md += `| Bật nhắc nhở | ${slaConfig.enableReminders ? 'Có' : 'Không'} | |\n`;
md += `| Bật cảnh báo dashboard | ${slaConfig.enableDashboardAlert ? 'Có' : 'Không'} | |\n\n`;

// --- AREA NORMALIZATION ---
md += `---\n\n## VII. BẢNG CHUẨN HÓA KHU VỰC ĐỊA LÝ (${areaNormalization.length} mã vùng)\n\n`;
md += `| Mã vùng | Loại | Tên nhận diện |\n|---------|------|---------------|\n`;
areaNormalization.forEach(a => {
    md += `| ${a.code} | ${a.type} | ${a.patterns.join(', ')} |\n`;
});
md += `\n`;

md += `### Nhóm vùng lân cận (cho AI Continuity Scoring)\n\n`;
regionGroups.forEach(g => {
    md += `- **${g.name}**: ${g.areas.join(' ↔ ')}\n`;
});
md += `\n`;

// --- PHƯƠNG PHÁP XỬ LÝ ---
md += `---\n\n## VIII. TÓM TẮT CÁC PHƯƠNG PHÁP XỬ LÝ & LÀM SẠCH\n\n`;
md += `| # | Nhóm dữ liệu | Phương pháp | File nguồn |\n`;
md += `|---|--------------|------------|------------|\n`;
md += `| 1 | RouteConfigs | Excel → JSON cấu trúc, phân loại cargoType, tách giá 4 chiều | server.js, db.json |\n`;
md += `| 2 | Customers | Mã hóa code Latin, phân loại nội bộ/đối tác | server.js |\n`;
md += `| 3 | Users | Hash mật khẩu bcrypt, phân quyền RBAC 7 vai trò | db.json |\n`;
md += `| 4 | Tickets | sanitizeTicketForDb(): parse JSON an toàn, map field, loại undefined | api.ts |\n`;
md += `| 5 | F/E values | Normalize: Full→F, Empty→E | orders/index.js |\n`;
md += `| 6 | Night Stay Location | Normalize: IN_CITY/INNER_CITY→INNER_CITY | TicketModal.tsx |\n`;
md += `| 7 | Revenue/Salary | Auto-lookup từ RouteConfig + Snapshot Pattern | TicketModal.tsx |\n`;
md += `| 8 | Salary History | Time-Travel Pricing (effectiveDate) | DriverSalaryTable.tsx |\n`;
md += `| 9 | Area Codes | NLP normalizeArea(): tên tiếng Việt→mã vùng chuẩn | dispatch/suggest.js |\n`;
md += `| 10 | Route dedup | Deduplicate by customer+routeName+cargoType | api.ts |\n`;
md += `| 11 | License Plates | Array→Set dedup khi xuất bảng lương | DriverSalaryTable.tsx |\n`;
md += `| 12 | Date/Time | Local datetime→ISO 8601 string | TicketModal.tsx |\n`;

md += `\n---\n\n*Xuất tự động bởi export_processed_data.js*\n`;

fs.writeFileSync(outputMdPath, md, 'utf-8');
console.log(`✅ Đã xuất Markdown: ${outputMdPath}`);

console.log('\n📊 THỐNG KÊ:');
console.log(`   Tuyến vận chuyển: ${stats.transportRoutes} bản ghi (${stats.uniqueTransportRouteNames} tên duy nhất)`);
console.log(`   Cấu hình lưu đêm: ${stats.nightStayConfigs}`);
console.log(`   Tuyến catch-all: ${stats.catchAllRoutes}`);
console.log(`   Tuyến trùng tên: ${stats.duplicateRouteNames.join(', ') || 'Không'}`);
console.log(`   Users: ${stats.totalUsers} (${stats.driversCount} tài xế)`);
console.log(`   Khách hàng: ${stats.totalCustomers}`);
console.log(`   Lương: ${stats.salaryRange.min.toLocaleString()}đ – ${stats.salaryRange.max.toLocaleString()}đ`);
console.log(`   Dầu: ${stats.fuelQuotaRange.min}L – ${stats.fuelQuotaRange.max}L`);
